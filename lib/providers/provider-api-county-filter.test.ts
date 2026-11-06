import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { providerApiCountyFilter } from './provider-api-county-filter';

const queries = readFileSync(join(process.cwd(), 'lib/providers/queries.ts'), 'utf8');

test('providers API county filter is one launch county id', () => {
  const filter = providerApiCountyFilter({ id: 'miami_dade' });
  assert.equal(filter, 'contact->>launch_county_id.eq.miami_dade');
  assert.equal(filter.includes('ilike'), false);
  assert.equal(filter.includes('county.eq'), false);
  assert.equal(filter.includes(','), false);
});

test('providers directory count is planned and the county filter stays one id', () => {
  assert.match(queries, /count: 'planned'/);
  assert.equal(queries.includes("count: 'exact'"), false);
  assert.match(queries, /providerApiCountyFilter\(launchCounty\)/);
  assert.equal(queries.includes('countyMatchOrParts'), false);
  assert.equal(queries.includes('providerMatchesLaunchCounties'), false);
});
