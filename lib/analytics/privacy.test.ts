import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isReplayEvent,
  sanitizeAnalyticsPath,
  sanitizeAnalyticsUrl,
  sanitizeCaptureResult,
  stripElementsChainText,
} from './privacy';
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
