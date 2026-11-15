import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isReplayEvent,
  sanitizeAnalyticsPath,
  sanitizeAnalyticsRequestBody,
  sanitizeAnalyticsUrl,
  sanitizeCaptureResult,
  stripElementsChainText,
  suppressExceptionCapture,
} from './privacy';
import { analyticsBrowserOptOut, shouldEnablePosthog } from './environment';
import { pageviewDedupeKey } from './trusthub';

test('URL sanitizer strips q and other free-text params from page URLs', () => {
  const current = sanitizeAnalyticsUrl(
    'https://www.insurancetrusthub.com/ask?q=who+sells+medicare+in+miami&state=FL&page=2&email=a%40b.c&token=secret',
  );
  assert.equal(current, 'https://www.insurancetrusthub.com/ask?state=FL&page=2');

  const entry = sanitizeAnalyticsUrl(
    'https://www.insurancetrusthub.com/directory?query=sunshine%20agency&keywords=how%20do%20I%20file&state=TX',
  );
  assert.equal(entry, 'https://www.insurancetrusthub.com/directory?state=TX');

  const referrer = sanitizeAnalyticsUrl('https://www.google.com/search?q=insurance+npn+10391484&state=OH');
  assert.equal(referrer, 'https://www.google.com/search?state=OH');

  assert.equal(
    sanitizeAnalyticsPath('/ask?q=secret%20question&state=MA&question=what%20is%20an%20appointment'),
    '/ask?state=MA',
  );
  assert.equal(sanitizeAnalyticsPath('/providers/example-agency'), '/providers/example-agency');
});

test('URL sanitizer drops unstructured free-text values and keeps short structured filters', () => {
  const url = sanitizeAnalyticsUrl(
    'https://www.insurancetrusthub.com/directory?specialty=Health&requestedPlace=Miami%20Beach&note=call%20me&zip=33101',
  );
  assert.equal(url, 'https://www.insurancetrusthub.com/directory?specialty=Health&zip=33101');
  assert.equal(sanitizeAnalyticsUrl('not a url ???'), 'not a url ');
});

test('before_send sanitizes URL properties and keeps the PostHog token', () => {
  const event = sanitizeCaptureResult({
    event: '$pageview',
    properties: {
      token: 'phc_public',
      distinct_id: 'anon',
      q: 'raw search text',
      query: 'also raw',
      $current_url: 'https://www.insurancetrusthub.com/ask?q=licensed%20agencies&state=FL',
      $session_entry_url: 'https://www.insurancetrusthub.com/ask?question=what%20is%20NPN',
      $referrer: 'https://example.com/?q=secret',
      $pathname: '/ask?q=secret&state=FL',
      $title: 'Ask: licensed agencies',
      attr__href: '/ask?q=secret&page=2',
    },
  });

  assert.equal(event?.properties?.token, 'phc_public');
  assert.equal(event?.properties?.distinct_id, 'anon');
  assert.equal(event?.properties?.q, undefined);
  assert.equal(event?.properties?.query, undefined);
  assert.equal(event?.properties?.$current_url, 'https://www.insurancetrusthub.com/ask?state=FL');
  assert.equal(event?.properties?.$session_entry_url, 'https://www.insurancetrusthub.com/ask');
  assert.equal(event?.properties?.$referrer, 'https://example.com/');
  assert.equal(event?.properties?.$pathname, '/ask?state=FL');
  assert.equal(event?.properties?.$title, 'Insurance Trust Hub');
  assert.equal(event?.properties?.attr__href, 'https://www.insurancetrusthub.com/ask?page=2');
});

test('URL sanitizer does not throw on empty or garbage input', () => {
  assert.equal(sanitizeAnalyticsUrl(undefined), undefined);
  assert.equal(sanitizeAnalyticsUrl(''), undefined);
  assert.doesNotThrow(() => sanitizeCaptureResult(null));
  assert.doesNotThrow(() =>
    sanitizeCaptureResult({
      properties: {
        $current_url: '::::',
        $pathname: '',
        $session_entry_url: null as unknown as string,
      },
    }),
  );
});

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASK = 'does sunshine agency have complaints';

test('autocapture never carries element text or the raw Ask query', () => {
  const event = sanitizeCaptureResult({
    event: '$autocapture',
    properties: {
      token: 'phc_test_token',
      $current_url: `https://www.insurancetrusthub.com/ask?q=${encodeURIComponent(ASK)}&state=FL`,
      $pathname: '/ask',
      $title: `Ask: ${ASK}`,
      $el_text: ASK,
      $elements_chain: `button.chip:text="${ASK}"nth-child="1";a:attr__href="/ask?q=${encodeURIComponent(ASK)}"attr__title="${ASK}"nth-child="2"`,
      $elements: [
        { tag_name: 'button', $el_text: ASK, text: ASK, 'attr__aria-label': ASK, attr__class: 'chip' },
        { tag_name: 'option', $el_text: ASK, attr__value: ASK },
        { tag_name: 'a', attr__href: `/ask?q=${encodeURIComponent(ASK)}&state=FL`, href: `/ask?q=${encodeURIComponent(ASK)}` },
      ],
    },
  });
  assert.ok(event?.properties);
  assert.equal(event.properties.$el_text, undefined);
  assert.equal(event.properties.$title, 'Insurance Trust Hub');
  const serialized = JSON.stringify(event);
  assert.equal(/sunshine|complaints/i.test(serialized), false);
  assert.match(String(event.properties.$elements_chain), /^button\.chip:nth-child="1"/);
});

test('elements chain text stripping handles escaped quotes', () => {
  assert.equal(
    stripElementsChainText('a.x:attr__href="/d"text="a \\"b\\" c"nth-child="2";label:text="s"'),
    'a.x:attr__href="/d"nth-child="2";label:',
  );
});

test('custom search events carry no raw search text', () => {
  const event = sanitizeCaptureResult({
    event: 'search_results_returned',
    properties: { token: 'phc_test_token', hub: 'insurance', surface: 'directory', result_count: 12, q: ASK, query: ASK, search: ASK },
  });
  assert.ok(event?.properties);
  assert.equal(/sunshine/i.test(JSON.stringify(event)), false);
  assert.equal(event.properties.result_count, 12);
});

test('q-only navigations get a new pageview dedupe key (Vercel Agent finding)', () => {
  const a = 'https://www.insurancetrusthub.com/ask?q=first+question&state=FL';
  const b = 'https://www.insurancetrusthub.com/ask?q=second+question&state=FL';
  // Sanitized URLs are identical, which is why deduping on them dropped the pageview.
  assert.equal(sanitizeAnalyticsUrl(a), sanitizeAnalyticsUrl(b));
  assert.notEqual(pageviewDedupeKey('/ask', a), pageviewDedupeKey('/ask', b));
  assert.equal(pageviewDedupeKey('/ask', a), pageviewDedupeKey('/ask', `${a}#results`));
});

test('directory beacon re-reports a new search with the same count and state', () => {
  const source = readFileSync(path.join(HERE, '../../components/analytics/search-results-beacon.tsx'), 'utf8');
  assert.match(source, /useSearchParams\(\)/);
  assert.match(source, /\[surface, resultCount, success, state, capabilityState, searchKey\]/);
  const payload = source.split('captureTrustEvent(TRUSTHUB_EVENTS.SEARCH_RESULTS_RETURNED, {')[1]?.split('});')[0] ?? '';
  assert.ok(payload.includes('result_count'));
  assert.equal(payload.includes('searchKey'), false);
});

test('session replay payloads are dropped and the browser client disables replay', () => {
  assert.equal(isReplayEvent('$snapshot'), true);
  assert.equal(isReplayEvent('$pageview'), false);
  const source = readFileSync(path.join(HERE, 'posthog-browser.ts'), 'utf8');
  assert.match(source, /disable_session_recording:\s*true/);
  assert.match(source, /mask_all_text:\s*true/);
  assert.match(source, /maskAllInputs:\s*true/);
  assert.match(source, /isReplayEvent\(event\.event\)\) return null/);
});

test('no $exception events are sent', () => {
  const dropped = suppressExceptionCapture({
    event: '$exception',
    properties: {
      $exception_list: [{ type: 'Error', value: 'who sells medicare in miami' }],
      $exception_message: 'who sells medicare in miami',
    },
  });
  assert.equal(dropped, null);

  const pageview = suppressExceptionCapture({
    event: '$pageview',
    properties: { $pathname: '/privacy', $exception_list: [{ type: 'Error' }] },
  });
  assert.equal(pageview?.event, '$pageview');
  assert.equal(pageview?.properties && '$exception_list' in pageview.properties, false);

  const source = readFileSync(path.join(HERE, 'posthog-browser.ts'), 'utf8');
  assert.match(source, /capture_exceptions:\s*false/);
  assert.match(source, /suppressExceptionCapture\(event\)/);
  assert.match(source, /respect_dnt:\s*true/);
  assert.match(source, /capture_copied_text:\s*false/);
  assert.match(source, /capture_value_css_selector_allowlist:\s*\[\]/);
  assert.match(source, /disable_session_recording:\s*true/);
});

test('Do Not Track or blocked cookies opt out of analytics', () => {
  const previous = globalThis.navigator;
  try {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { doNotTrack: '1', cookieEnabled: true },
    });
    assert.equal(analyticsBrowserOptOut(), true);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { doNotTrack: '0', cookieEnabled: false },
    });
    assert.equal(analyticsBrowserOptOut(), true);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { doNotTrack: '0', cookieEnabled: true },
    });
    assert.equal(analyticsBrowserOptOut(), false);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { doNotTrack: '0', cookieEnabled: true, globalPrivacyControl: true },
    });
    assert.equal(analyticsBrowserOptOut(), true);
  } finally {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: previous });
  }
});

test('identify, pageview, and custom event payloads drop email, search, and auth fields', () => {
  const secret = 'who sells medicare in miami';
  const email = 'person@example.com';
  const identify = sanitizeCaptureResult({
    event: '$identify',
    properties: {
      distinct_id: email,
      email,
      $email: email,
      password: 'hunter2-secret',
      access_token: 'auth-secret-value',
      otp: '998877',
      q: secret,
      search: secret,
      $ip: '203.0.113.10',
      $current_url: `https://www.insurancetrusthub.com/ask?q=${encodeURIComponent(secret)}&access_token=abc&email=${encodeURIComponent(email)}&state=FL`,
      $set: { email, name: 'Pat Example', search: secret },
    },
    $set: { email, password: 'hunter2-secret', search: secret },
  });
  const identifyJson = JSON.stringify(identify);
  assert.equal(identifyJson.includes(email), false);
  assert.equal(identifyJson.includes(secret), false);
  assert.equal(identifyJson.includes('hunter2-secret'), false);
  assert.equal(identifyJson.includes('auth-secret-value'), false);
  assert.equal(identifyJson.includes('998877'), false);
  assert.equal(identifyJson.includes('203.0.113.10'), false);
  assert.equal(identify?.properties?.$geoip_disable, true);
  assert.equal(identify?.properties?.$ip, undefined);
  assert.match(String(identify?.properties?.$current_url), /state=FL/);
  assert.equal(String(identify?.properties?.$current_url).includes('q='), false);

  const pageview = sanitizeCaptureResult(
    suppressExceptionCapture({
      event: '$pageview',
      properties: {
        $current_url: `https://www.insurancetrusthub.com/search?q=${encodeURIComponent(secret)}&email=${encodeURIComponent(email)}&state=FL`,
        $exception_message: secret,
        $exception_list: [{ type: 'Error', value: secret }],
      },
    }),
  );
  const pageJson = JSON.stringify(pageview);
  assert.equal(pageview?.event, '$pageview');
  assert.equal(pageJson.includes(secret), false);
  assert.equal(pageJson.includes(email), false);
  assert.equal(pageview?.properties?.$geoip_disable, true);

  const custom = sanitizeCaptureResult({
    event: 'search_submitted',
    properties: {
      surface: 'ask_form',
      success: true,
      stateCode: 'FL',
      query: secret,
      email,
      password: 'hunter2-secret',
    },
  });
  assert.equal(custom?.properties?.surface, 'ask_form');
  assert.equal(custom?.properties?.success, true);
  assert.equal(custom?.properties?.stateCode, 'FL');
  const customJson = JSON.stringify(custom);
  assert.equal(customJson.includes(secret), false);
  assert.equal(customJson.includes(email), false);
  assert.equal(customJson.includes('hunter2-secret'), false);
});

test('short authentication codes are stripped from the current url', () => {
  const cleaned = sanitizeAnalyticsUrl(
    'https://www.insurancetrusthub.com/auth/callback?code=ab&state=FL',
  );
  assert.ok(cleaned);
  const url = new URL(cleaned);
  assert.equal(url.searchParams.has('code'), false);
  assert.equal(url.searchParams.get('state'), 'FL');
  assert.equal(cleaned.includes('code='), false);

  const event = sanitizeCaptureResult({
    event: '$pageview',
    properties: {
      $current_url: 'https://www.insurancetrusthub.com/auth/callback?code=xy&state=FL',
    },
  });
  const current = String(event?.properties?.$current_url);
  assert.equal(current.includes('code='), false);
  assert.match(current, /state=FL/);
  assert.equal(event?.properties?.$geoip_disable, true);
});

test('a project key alone does not enable product analytics', () => {
  const saved = {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    debug: process.env.NEXT_PUBLIC_POSTHOG_DEBUG,
    activation: process.env.NEXT_PUBLIC_POSTHOG_ACTIVATION,
    vercel: process.env.VERCEL_ENV,
    next: process.env.NEXT_PUBLIC_VERCEL_ENV,
  };
  try {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test';
    process.env.VERCEL_ENV = 'production';
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
    delete process.env.NEXT_PUBLIC_POSTHOG_DEBUG;
    delete process.env.NEXT_PUBLIC_POSTHOG_ACTIVATION;
    assert.equal(shouldEnablePosthog(), false);
    process.env.NEXT_PUBLIC_POSTHOG_ACTIVATION = 'enabled';
    assert.equal(shouldEnablePosthog(), true);
    process.env.NEXT_PUBLIC_POSTHOG_ACTIVATION = ' true ';
    assert.equal(shouldEnablePosthog(), false);
    for (const activation of [' enabled', 'enabled ', '\tenabled\n', 'ENABLED', 'Enabled', '1']) {
      process.env.NEXT_PUBLIC_POSTHOG_ACTIVATION = activation;
      assert.equal(shouldEnablePosthog(), false, JSON.stringify(activation));
    }
  } finally {
    for (const [name, value] of [
      ['NEXT_PUBLIC_POSTHOG_KEY', saved.key],
      ['NEXT_PUBLIC_POSTHOG_DEBUG', saved.debug],
      ['NEXT_PUBLIC_POSTHOG_ACTIVATION', saved.activation],
      ['VERCEL_ENV', saved.vercel],
      ['NEXT_PUBLIC_VERCEL_ENV', saved.next],
    ] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test('sdk privacy 002 strips auth properties, adversarial urls, and private attributes', () => {
  const urls = [
    'https://qa.invalid/?state=qa%40example.invalid',
    'https://qa.invalid/?state=qa%2540example.invalid',
    'https://qa.invalid/?custom=qa%40example.invalid',
    'https://qa.invalid/?custom=%E0%A4%A',
    'https://qa.invalid/?auth_code=123456',
    'https://qa.invalid/?redirect_uri=https%3A%2F%2Ftarget.invalid%2F%3Fcode%3D123456',
    'https://qa.invalid/search/qa%40example.invalid',
    'https://qa.invalid/auth/callback?code=ab&state=FL',
  ];
  for (const input of urls) {
    const output = sanitizeAnalyticsUrl(input) || '';
    assert.doesNotThrow(() => decodeURIComponent(output), input);
    assert.equal(decodeURIComponent(output).includes('qa@example'), false, input);
    assert.equal(decodeURIComponent(output).includes('123456'), false, input);
    assert.equal(output.includes('%E0%A4%A'), false, input);
  }
  assert.match(sanitizeAnalyticsUrl('https://qa.invalid/auth/callback?code=ab&state=FL') || '', /state=FL/);

  const event = sanitizeCaptureResult({
    event: '$autocapture',
    properties: {
      code: '123456',
      auth_code: '654321',
      stateCode: 'FL',
      $elements_chain: 'button:attr__data-note="PRIVATE_NOTE"attr__id="safe"attr_id="safe"',
      $elements: [{ tag_name: 'button', 'attr__data-note': 'PRIVATE_NOTE', attr__id: 'safe', attr_id: 'safe' }],
    },
  });
  const json = JSON.stringify(event);
  assert.equal(json.includes('123456'), false);
  assert.equal(json.includes('654321'), false);
  assert.equal(json.includes('PRIVATE_'), false);
  assert.equal(event?.properties?.stateCode, 'FL');
  assert.equal(event?.properties?.$geoip_disable, true);
});

test('sdk privacy 003 strips encoded urls and nested flag fields', () => {
  const urls = [
    'https://qa.invalid/search?%2571=eldercare-sensitive-query',
    'https://qa.invalid/search?redirect_uri=https%3A%2F%2Ftarget.invalid%2F%3FauthCode%3DAuthZ9x7',
    'https://qa.invalid/search?%2570assword=PwdZ9x7',
    'https://qa.invalid/search?searchTerm=eldercare-sensitive-query',
    'https://qa.invalid/search#access_token=AuthZ9x7',
  ];
  for (const input of urls) {
    const output = sanitizeAnalyticsUrl(input) || '';
    assert.equal(/eldercare-sensitive-query|AuthZ9x7|PwdZ9x7/.test(output), false, input);
  }
  assert.match(sanitizeAnalyticsUrl('https://qa.invalid/auth/callback?code=ab&state=FL') || '', /state=FL/);
  const body = sanitizeAnalyticsRequestBody(
    JSON.stringify({
      token: 'phc_test',
      distinct_id: 'visitor',
      person_properties: {
        query: 'eldercare-sensitive-query',
        question: 'family-sensitive-question',
        search: 'treatment-sensitive-search',
        token: 'AuthZ9x7',
        password: 'PwdZ9x7',
        email: 'alex@example.invalid',
        $lib: 'web',
      },
    }),
  );
  assert.ok(body);
  assert.match(body, /phc_test/);
  assert.match(body, /"\$lib":"web"/);
  assert.equal(
    /eldercare-sensitive-query|family-sensitive-question|treatment-sensitive-search|AuthZ9x7|PwdZ9x7|alex@/.test(body),
    false,
  );
});
