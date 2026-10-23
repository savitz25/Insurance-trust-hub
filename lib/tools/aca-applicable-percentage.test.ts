import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applicablePercent } from '../marketplace/ptc-context';
import {
  ACA_2026_APPLICABLE_PERCENTAGE_BANDS,
  aca2026ApplicablePercentage,
} from './aca-applicable-percentage';
import { fplForHousehold, requiredContributionPercent } from './aca-cost-planner';
import { statutoryApplicablePercent } from './aca-subsidy-planner';

/**
 * Handoff boundary rows (`q1_boundary_tests.csv`, column irs_2026).
 * Percentages are rounded to 3 decimal places, matching that fixture.
 * Null means ineligible (above the 400% FPL cutoff).
 */
const BOUNDARY_ROWS: Array<{ fplPct: number; irs: number | null }> = [
  { fplPct: 100, irs: 2.1 },
  { fplPct: 132.99, irs: 2.1 },
  { fplPct: 133, irs: 3.14 },
  { fplPct: 149.99, irs: 4.189 },
  { fplPct: 150, irs: 4.19 },
  { fplPct: 199.99, irs: 6.6 },
  { fplPct: 200, irs: 6.6 },
  { fplPct: 249.99, irs: 8.44 },
  { fplPct: 250, irs: 8.44 },
  { fplPct: 299.99, irs: 9.96 },
  { fplPct: 300, irs: 9.96 },
  { fplPct: 400, irs: 9.96 },
  { fplPct: 400.01, irs: null },
];

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

test('Rev. Proc. 2025-25 §3.01 band endpoints', () => {
  assert.deepEqual(
    ACA_2026_APPLICABLE_PERCENTAGE_BANDS.map((band) => ({
      lowerInclusive: band.lowerInclusive,
      upper: band.upper,
      upperInclusive: band.upperInclusive,
      initial: band.initial,
      final: band.final,
    })),
    [
      { lowerInclusive: 100, upper: 133, upperInclusive: false, initial: 2.1, final: 2.1 },
      { lowerInclusive: 133, upper: 150, upperInclusive: false, initial: 3.14, final: 4.19 },
      { lowerInclusive: 150, upper: 200, upperInclusive: false, initial: 4.19, final: 6.6 },
      { lowerInclusive: 200, upper: 250, upperInclusive: false, initial: 6.6, final: 8.44 },
      { lowerInclusive: 250, upper: 300, upperInclusive: false, initial: 8.44, final: 9.96 },
      { lowerInclusive: 300, upper: 400, upperInclusive: true, initial: 9.96, final: 9.96 },
    ]
  );
});

for (const row of BOUNDARY_ROWS) {
  test(`all three PTC paths at ${row.fplPct}% FPL`, () => {
    const ratio = row.fplPct / 100;
    const shared = aca2026ApplicablePercentage(ratio);
    const costPlanner = requiredContributionPercent(ratio);
    const subsidyPlanner = statutoryApplicablePercent(ratio);
    const planExplorer = applicablePercent(ratio);

    if (row.irs == null) {
      assert.equal(shared, null);
      assert.equal(costPlanner, 100);
      assert.equal(subsidyPlanner, null);
      assert.equal(planExplorer, null);
      return;
    }

    assert.equal(round3(shared!), row.irs);
    assert.equal(round3(costPlanner), row.irs);
    assert.equal(round3(subsidyPlanner!), row.irs);
    assert.ok(planExplorer != null);
    assert.equal(round3(planExplorer * 100), row.irs);
  });
}

test('400% FPL stays eligible and income above the cutoff does not', () => {
  assert.equal(aca2026ApplicablePercentage(4), 9.96);
  assert.equal(requiredContributionPercent(4), 9.96);
  assert.equal(statutoryApplicablePercent(4), 9.96);
  assert.equal(applicablePercent(4), 9.96 / 100);

  for (const ratio of [4.0001, 4.25, 5]) {
    assert.equal(aca2026ApplicablePercentage(ratio), null);
    assert.equal(requiredContributionPercent(ratio), 100);
    assert.equal(statutoryApplicablePercent(ratio), null);
    assert.equal(applicablePercent(ratio), null);
  }
});

test('income under 100% FPL stays outside the premium tax credit', () => {
  for (const ratio of [0, 0.5, 0.9999]) {
    assert.equal(aca2026ApplicablePercentage(ratio), null);
    assert.equal(requiredContributionPercent(ratio), 100);
    assert.equal(statutoryApplicablePercent(ratio), null);
    assert.equal(applicablePercent(ratio), null);
  }
});

test('sliding bands interpolate linearly at their midpoints', () => {
  const midpoints: Array<{ fplPct: number; percent: number }> = [
    { fplPct: 141.5, percent: 3.14 + (4.19 - 3.14) / 2 },
    { fplPct: 175, percent: 4.19 + (6.6 - 4.19) / 2 },
    { fplPct: 225, percent: 6.6 + (8.44 - 6.6) / 2 },
    { fplPct: 275, percent: 8.44 + (9.96 - 8.44) / 2 },
    { fplPct: 350, percent: 9.96 },
  ];
  for (const point of midpoints) {
    const shared = aca2026ApplicablePercentage(point.fplPct / 100);
    assert.ok(shared != null);
    assert.ok(Math.abs(shared - point.percent) < 1e-12);
    assert.equal(requiredContributionPercent(point.fplPct / 100), shared);
    assert.equal(statutoryApplicablePercent(point.fplPct / 100), shared);
    const fraction = applicablePercent(point.fplPct / 100);
    assert.ok(fraction != null);
    assert.ok(Math.abs(fraction * 100 - shared) < 1e-12);
  }
});

test('2025 HHS guidelines used for 2026 coverage (90 Fed. Reg. 5917)', () => {
  // 48 contiguous states and DC: $15,650 for one person, plus $5,500 each.
  assert.equal(fplForHousehold(1), 15650);
  assert.equal(fplForHousehold(2), 21150);
  assert.equal(fplForHousehold(3), 26650);
  assert.equal(fplForHousehold(4), 32150);
  assert.equal(fplForHousehold(8), 54150);
  assert.equal(fplForHousehold(9), 59650);
});
