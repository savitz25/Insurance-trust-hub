import assert from 'node:assert/strict';
import test from 'node:test';
import { clearRememberedCounts, rememberCount } from './provider-count-flight';

test('a failed refresh serves the last good count instead of throwing or zero', async () => {
  clearRememberedCounts();
  assert.equal(await rememberCount('k', 0, async () => 42), 42);
  const value = await rememberCount('k', 0, async () => {
    throw new Error('57014');
  });
  assert.equal(value, 42);
});

test('a failure with no prior good value still rejects', async () => {
  clearRememberedCounts();
  await assert.rejects(
    rememberCount('none', 0, async () => {
      throw new Error('57014');
    })
  );
});

test('a fresh value is reused without calling the loader', async () => {
  clearRememberedCounts();
  await rememberCount('f', 60_000, async () => 7);
  let called = false;
  const value = await rememberCount('f', 60_000, async () => {
    called = true;
    return 9;
  });
  assert.equal(value, 7);
  assert.equal(called, false);
});
