import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { normalizedPublishedStatePath } from './published-state-path';

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

test('PA-REL-001 mixed-case statewide paths normalize', () => {
  assert.equal(normalizedPublishedStatePath('/Pennsylvania'), '/pennsylvania');
  assert.equal(normalizedPublishedStatePath('/PENNSYLVANIA'), '/pennsylvania');
  assert.equal(normalizedPublishedStatePath('/PeNnSyLvAnIa'), '/pennsylvania');
  assert.equal(normalizedPublishedStatePath('/pennsylvania'), null);
  assert.equal(normalizedPublishedStatePath('/Pennsylvania/philadelphia'), null);
});

test('PA-REL-001 middleware issues 308', () => {
  const mw = read('middleware.ts');
  assert.match(mw, /normalizedPublishedStatePath/);
  assert.match(mw, /308/);
});
