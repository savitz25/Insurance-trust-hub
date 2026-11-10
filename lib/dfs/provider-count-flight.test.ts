import assert from 'node:assert/strict';
import test from 'node:test';
import { isReadyCount } from './provider-count';
import {
  clearRememberedCounts,
  COUNT_BACKOFF_BASE_MS,
  rememberCount,
  setCountClock,
  STALE_ON_ERROR_MS,
} from './provider-count-flight';

test('a failed refresh serves the last good count instead of throwing or zero', async () => {
  clearRememberedCounts();
  setCountClock(null);
  const first = await rememberCount('k', 0, async () => 42);
  assert.equal(isReadyCount(first) && first.value, 42);
  const value = await rememberCount('k', 0, async () => {
    throw new Error('57014');
  });
  assert.equal(isReadyCount(value) && value.value, 42);
  assert.equal(isReadyCount(value) && value.stale, true);
  clearRememberedCounts();
});

test('a failure with no prior good value still rejects', async () => {
  clearRememberedCounts();
  setCountClock(null);
  await assert.rejects(
    rememberCount('none', 0, async () => {
      throw new Error('57014');
    })
  );
  clearRememberedCounts();
});

test('a fresh value is reused without calling the loader', async () => {
  clearRememberedCounts();
  setCountClock(null);
  await rememberCount('f', 60_000, async () => 7);
  let called = false;
  const value = await rememberCount('f', 60_000, async () => {
    called = true;
    return 9;
  });
  assert.equal(isReadyCount(value) && value.value, 7);
  assert.equal(isReadyCount(value) && value.stale, false);
  assert.equal(called, false);
  clearRememberedCounts();
});

test('the 24h boundary keeps the original timestamp and then refuses the value', async () => {
  clearRememberedCounts();
  const start = 1_700_000_000_000;
  let current = start;
  setCountClock(() => current);
  const loaded = await rememberCount('age', 60_000, async () => ({ value: 9, asOf: start }));
  assert.deepEqual(loaded, { value: 9, asOf: start, stale: false });

  current = start + 70 * 60 * 1000;
  let refreshes = 0;
  const stale = await rememberCount('age', 60_000, async () => {
    refreshes += 1;
    return { value: 11, asOf: current };
  });
  assert.equal(isReadyCount(stale) && stale.stale, true);
  assert.equal(isReadyCount(stale) && stale.asOf, start);
  assert.equal(isReadyCount(stale) && stale.value, 9);
  assert.equal(refreshes, 1);

  current = start + STALE_ON_ERROR_MS - 1;
  const still = await rememberCount('edge', 1_000, async () => ({
    value: 3,
    asOf: start,
  }));
  assert.equal(isReadyCount(still) && still.value, 3);

  current = start + STALE_ON_ERROR_MS;
  await assert.rejects(
    rememberCount('edge', 1_000, async () => {
      throw new Error('57014');
    })
  );
  setCountClock(null);
  clearRememberedCounts();
});

test('a failed refresh backs off instead of calling the loader again', async () => {
  clearRememberedCounts();
  const start = 1_800_000_000_000;
  let current = start;
  setCountClock(() => current);
  let calls = 0;
  const fail = () => {
    calls += 1;
    return Promise.reject(new Error('57014'));
  };
  await assert.rejects(rememberCount('bo', 1_000, fail));
  await assert.rejects(rememberCount('bo', 1_000, fail));
  assert.equal(calls, 1);
  current = start + COUNT_BACKOFF_BASE_MS;
  await assert.rejects(rememberCount('bo', 1_000, fail));
  assert.equal(calls, 2);
  setCountClock(null);
  clearRememberedCounts();
});

test('a stale data-cache hit does not clear backoff', async () => {
  clearRememberedCounts();
  const start = 2_000_000_000_000;
  let current = start;
  setCountClock(() => current);
  await rememberCount('stamp', 1_000, async () => ({ value: 4, asOf: start }));
  current = start + 5_000;
  let hits = 0;
  await rememberCount('stamp', 1_000, async () => {
    hits += 1;
    return { value: 4, asOf: start };
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(hits, 1);
  let later = 0;
  await rememberCount('stamp', 1_000, async () => {
    later += 1;
    return { value: 9, asOf: current + 1 };
  });
  assert.equal(later, 0);
  current = start + 5_000 + COUNT_BACKOFF_BASE_MS;
  await rememberCount('stamp', 1_000, async () => {
    later += 1;
    return { value: 9, asOf: current };
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const seen = await rememberCount('stamp', 60_000, async () => {
    throw new Error('stored live result should be fresh');
  });
  assert.equal(isReadyCount(seen) && seen.value, 9);
  assert.equal(isReadyCount(seen) && seen.asOf, current);
  setCountClock(null);
  clearRememberedCounts();
});

test('concurrent stale readers share one refresh', async () => {
  clearRememberedCounts();
  const start = 2_100_000_000_000;
  let current = start;
  setCountClock(() => current);
  await rememberCount('flight', 1_000, async () => ({ value: 2, asOf: start }));
  current = start + 5_000;
  let calls = 0;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const load = async () => {
    calls += 1;
    await gate;
    return { value: 6, asOf: current };
  };
  const [first, second] = await Promise.all([
    rememberCount('flight', 1_000, load),
    rememberCount('flight', 1_000, load),
  ]);
  assert.equal(calls, 1);
  assert.equal(isReadyCount(first) && first.value, 2);
  assert.equal(isReadyCount(second) && second.value, 2);
  release();
  await new Promise((resolve) => setTimeout(resolve, 0));
  setCountClock(null);
  clearRememberedCounts();
});

test('a stale value is returned before the background refresh settles', async () => {
  clearRememberedCounts();
  const start = 1_900_000_000_000;
  let current = start;
  setCountClock(() => current);
  await rememberCount('bg', 1_000, async () => ({ value: 5, asOf: start }));
  current = start + 5_000;
  let started = false;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const pending = rememberCount('bg', 1_000, async () => {
    started = true;
    await gate;
    return { value: 8, asOf: current };
  });
  const value = await pending;
  assert.equal(started, true);
  assert.equal(isReadyCount(value) && value.value, 5);
  assert.equal(isReadyCount(value) && value.stale, true);
  release();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const next = await rememberCount('bg', 60_000, async () => {
    throw new Error('should be fresh');
  });
  assert.equal(isReadyCount(next) && next.value, 8);
  assert.equal(isReadyCount(next) && next.stale, false);
  setCountClock(null);
  clearRememberedCounts();
});
