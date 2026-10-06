import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import snapshot from './ne-ins-001.json';
import { interpretInsuranceAskQuery } from '../insurance-ask/interpret';

const reason = (q: string) => interpretInsuranceAskQuery(q).query.failReason ?? '';

test('Nebraska insurer counts stay inside one NAIC total', () => {
  assert.equal(snapshot.domesticAndLicensedForeignInsurers, 1687);
  assert.equal(snapshot.domesticInsurers, 155);
  assert.equal(snapshot.domesticIsInsideTotal, true);
  assert.equal(snapshot.captivesNotIncludedInTotal, true);
  assert.equal(snapshot.captiveCompanies, 4);
  assert.equal(snapshot.captiveDirectWrittenPremiumUsd, 0);
  const p = snapshot.statementPremiumsUsd;
  assert.equal(p.health + p.lifeAccidentAndHealth + p.propertyAndCasualty + p.title, p.total);
  assert.equal(p.propertyAndCasualty + 1, snapshot.propertyCasualtyLineTableTotalUsd);
  assert.equal(snapshot.rosters.individualProducers, 'NOT_ACQUIRED');
  assert.equal(snapshot.graphWrites, 0);
});

test('Nebraska insurance routing does not capture Nevada or a bare city', () => {
  assert.match(reason('Nebraska insurers'), /1,687/);
  assert.match(reason('insurance in ne'), /155 are inside the 1,687/);
  assert.match(reason('Nebraska insurance agents'), /NOT_ACQUIRED/);
  assert.match(reason('best Nebraska insurer'), /does not rank/);
  assert.doesNotMatch(reason('Nevada insurers'), /1,687 domestic and licensed foreign insurers/);
  assert.doesNotMatch(reason('insurance Omaha'), /1,687 domestic and licensed foreign insurers/);
  assert.match(reason('Omaha Nebraska insurance'), /geography only/);
  const page = readFileSync('app/nebraska/page.tsx', 'utf8');
  assert.match(page, /not added again/);
  assert.doesNotMatch(page, /AggregateRating|Trust Score/);
  assert.match(readFileSync('lib/seo/published-state-path.ts', 'utf8'), /'utah'/);
  assert.match(readFileSync('lib/home/published-states.ts', 'utf8'), /nebraska: 'NE'/);
});
