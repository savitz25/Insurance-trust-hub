import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeAnalyticsPath, sanitizeAnalyticsUrl, sanitizeCaptureResult } from './privacy';

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
