// Run: node --import tsx --test scripts/test-map-with-concurrency.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mapWithConcurrency,
  PUBLICATION_DB_CONCURRENCY,
  withPublicationDbSlot,
} from '../lib/map-with-concurrency.ts';

test('mapWithConcurrency preserves result order and respects its worker cap', async () => {
  let active = 0;
  let peak = 0;
  const startedAt = performance.now();
  const values = await mapWithConcurrency(Array.from({ length: 11 }, (_, i) => i), 3, async (item) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 30));
    active -= 1;
    return item * 2;
  });
  const elapsedMs = performance.now() - startedAt;

  assert.deepEqual(values, Array.from({ length: 11 }, (_, i) => i * 2));
  assert.equal(peak, 3);
  assert.ok(elapsedMs < 11 * 30, `expected improvement over serial execution, got ${elapsedMs.toFixed(1)}ms`);
});

test('withPublicationDbSlot caps overlapping database work at 3', async () => {
  let active = 0;
  let peak = 0;
  await Promise.all(
    Array.from({ length: 9 }, () =>
      withPublicationDbSlot(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 20));
        active -= 1;
      })
    )
  );
  assert.equal(PUBLICATION_DB_CONCURRENCY, 3);
  assert.equal(peak, 3);
});

test('withPublicationDbSlot releases the slot after a failure', async () => {
  await assert.rejects(
    withPublicationDbSlot(async () => {
      throw new Error('slot failed');
    }),
    /slot failed/
  );
  let ran = false;
  await withPublicationDbSlot(async () => {
    ran = true;
  });
  assert.equal(ran, true);
});

test('mapWithConcurrency keeps failure visible', async () => {
  await assert.rejects(
    mapWithConcurrency([1, 2, 3], 2, async (value) => {
      if (value === 2) throw new Error('query failed');
      return value;
    }),
    /query failed/
  );
});
