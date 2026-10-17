import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const navbar = readFileSync(join(root, 'components/navbar.tsx'), 'utf8');
const page = readFileSync(join(root, 'app/my-trusthub/page.tsx'), 'utf8');
const signIn = 'https://www.asktrusthub.com/my/sign-in';

test('header consumer-account controls reach Ask sign-in once per surface', () => {
  assert.equal(navbar.match(/href="https:\/\/www\.asktrusthub\.com\/my\/sign-in"/g)?.length, 3);
  assert.equal(navbar.includes('href="/my-trusthub"'), false);
  assert.match(navbar, /className="th-header-actions"[\s\S]*href="https:\/\/www\.asktrusthub\.com\/my\/sign-in"/);
  assert.match(navbar, /className="th-header-mobile-actions"[\s\S]*href="https:\/\/www\.asktrusthub\.com\/my\/sign-in"/);
  assert.match(navbar, /href="https:\/\/www\.asktrusthub\.com\/my\/sign-in" className="th-drawer-link" onClick=\{\(\) => setOpen\(false\)\}/);
  assert.match(navbar, /href="\/my-insurance"/);
  assert.match(navbar, /My Insurance workspace/);
});

test('onward account link reaches Ask sign-in and keeps the device-only explanation', () => {
  assert.match(page, new RegExp(`href="${signIn.replaceAll('/', '\\/')}"`));
  assert.equal(page.includes('href="https://www.asktrusthub.com/my"'), false);
  assert.match(page, /Sync to My TrustHub is off/);
  assert.match(page, /does not create a My TrustHub account record or start a watch/);
  assert.match(page, /href=\{MY_INSURANCE_PATH\}/);
  assert.match(page, /Open My Insurance workspace/);
});
