import React from 'react';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExactMatchClause, HeadCountValue } from '@/components/head-count-value';
import { buildHubMetadata } from '@/lib/hubs/hub-seo';
import { getHubBySlug } from '@/lib/hubs/registry';
import { EMPTY_MARKET_COPY } from '@/lib/insurance/trust/provider-trust-state';
import {
  combineHeadCounts,
  exactTotalsSentence,
  hubSeoForCount,
  isReadyCount,
  settleHubPage,
  type HeadCount,
} from './provider-count';

const fresh: HeadCount = { value: 120, asOf: Date.UTC(2026, 10, 10, 16, 0), stale: false };
const stale: HeadCount = { value: 120, asOf: Date.UTC(2026, 10, 10, 12, 0), stale: true };
const missing: HeadCount = { unavailable: true };

test('a failed county in a sum is unavailable, never a zero partial', () => {
  const combined = combineHeadCounts([fresh, missing, { value: 4, asOf: fresh.asOf, stale: false }]);
  assert.deepEqual(combined, { unavailable: true });
  assert.equal('value' in combined, false);
});

test('pagination uses a stale total and falls back to listed rows when unavailable', () => {
  const stalePage = settleHubPage({ count: stale, pageSize: 100, page: 1, rowCount: 40 });
  assert.equal(stalePage.total, 120);
  assert.equal(stalePage.totalPages, 2);
  assert.equal(isReadyCount(stalePage.count) && stalePage.count.stale, true);

  const missed = settleHubPage({ count: missing, pageSize: 100, page: 2, rowCount: 15 });
  assert.equal(missed.total, null);
  assert.equal(missed.totalPages, 2);
  assert.deepEqual(missed.count, { unavailable: true });

  const emptyMiss = settleHubPage({ count: missing, pageSize: 100, page: 1, rowCount: 0 });
  assert.equal(emptyMiss.total, null);
  assert.equal(emptyMiss.totalPages, 0);
});

test('an unavailable count does not noindex a page that lists rows', () => {
  const withRows = hubSeoForCount({ count: missing, listed: 8 });
  assert.equal(withRows.index, true);
  assert.equal(withRows.isEmpty, false);
  const hub = getHubBySlug('florida', 'miami-dade');
  assert.ok(hub);
  const meta = buildHubMetadata(hub, '/hubs/florida/miami-dade', {
    total: null,
    listed: 8,
    count: missing,
  });
  assert.equal(meta.robots && typeof meta.robots === 'object' && meta.robots.index, true);
  assert.equal(String(meta.description).includes(EMPTY_MARKET_COPY.hero), false);
  assert.equal(String(meta.description).includes(EMPTY_MARKET_COPY.section), false);
  assert.equal(String(meta.description).includes('count is temporarily unavailable'), true);

  const genuineEmpty = hubSeoForCount({ count: { value: 0, asOf: 1, stale: false }, listed: 0 });
  assert.equal(genuineEmpty.index, false);
  assert.equal(genuineEmpty.isEmpty, true);
});

test('the exact-match sentence renders only for a fresh count, and stale counts say as of', () => {
  assert.equal(exactTotalsSentence([fresh]), expectSentence());
  assert.equal(exactTotalsSentence([stale]), null);
  assert.equal(exactTotalsSentence([missing]), null);

  const freshHtml = renderToStaticMarkup(<ExactMatchClause counts={[fresh]} />);
  const staleHtml = renderToStaticMarkup(<ExactMatchClause counts={[stale]} />);
  const missingHtml = renderToStaticMarkup(<ExactMatchClause counts={[missing]} />);
  assert.equal(freshHtml.includes('Totals below are exact match counts'), true);
  assert.equal(staleHtml.includes('Totals below are exact match counts'), false);
  assert.equal(missingHtml.includes('Totals below are exact match counts'), false);

  const staleValue = renderToStaticMarkup(<HeadCountValue count={stale} />);
  const missingValue = renderToStaticMarkup(<HeadCountValue count={missing} />);
  assert.equal(staleValue.includes('120'), true);
  assert.equal(staleValue.includes('as of'), true);
  assert.equal(missingValue.includes('count temporarily unavailable'), true);
  assert.equal(missingValue.includes('>0<'), false);
});

test('count helpers do not catch a failure as zero', () => {
  const head = readFileSync(join(process.cwd(), 'lib/dfs/provider-head-count.ts'), 'utf8');
  const county = readFileSync(join(process.cwd(), 'lib/dfs/providers-by-county.ts'), 'utf8');
  const live = readFileSync(join(process.cwd(), 'lib/directory/live-counts.ts'), 'utf8');
  const stateCount = head.slice(head.indexOf('export async function countVerifiedProvidersInState'));
  assert.equal(stateCount.includes('return 0'), false);
  const market = county.slice(
    county.indexOf('async function exactMarketHeadCount'),
    county.indexOf('function emptyInventory')
  );
  assert.equal(market.includes('return 0'), false);
  const counties = county.slice(
    county.indexOf('async function countVerifiedForCounties'),
    county.indexOf('async function exactMarketHeadCount')
  );
  assert.equal(counties.includes('return 0'), false);
  assert.equal(counties.includes('Promise.all'), true);
  assert.equal(live.includes('return { fl: 0'), false);
  assert.match(live, /throw new Error\('verified launch counts unavailable'\)/);
});

function expectSentence(): string {
  return 'Totals below are exact match counts for public research listings — empty markets stay empty.';
}
