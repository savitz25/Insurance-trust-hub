/**
 * Phase 5 structural guards — LOA tags honest, promote defaults business-only,
 * no Medicare-from-DFS inference.
 */
import assert from 'node:assert/strict';
import {
  capabilitiesToSpecialties,
  classifyLoas,
  loaSpecialtyTags,
} from '../lib/dfs/loa';

function main() {
  const loas = classifyLoas(['Life Including Variable Annuity', 'Health', 'General Lines']);
  assert.ok(loas.includes('life'));
  assert.ok(loas.includes('health'));
  assert.ok(loas.includes('property_casualty'));

  const tags = capabilitiesToSpecialties(loas, 'business');
  assert.ok(tags.includes('Agency'));
  assert.ok(tags.includes('Health'));
  assert.ok(tags.includes('Life'));
  assert.ok(tags.includes('Property & Casualty'));
  assert.ok(!tags.some((t) => /medicare/i.test(t)));

  const chips = loaSpecialtyTags([
    'Health',
    'Medicare Specialists',
    'Independent Agency',
    'Life',
  ]);
  assert.ok(chips.includes('Health'));
  assert.ok(chips.includes('Life'));
  assert.ok(!chips.includes('Medicare Specialists'));

  console.log('OK phase5 agency LOA guards');
}

main();
