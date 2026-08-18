/**
 * Insurance V2.1: homepage canonical + no unsolicited Move/Lender spray.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const home = readFileSync(join(root, 'app/page.tsx'), 'utf8');
const dest = readFileSync(join(root, 'app/destinations/page.tsx'), 'utf8');
const life = readFileSync(join(root, 'lib/network/life-journey.ts'), 'utf8');
const meta = readFileSync(join(root, 'lib/seo/metadata.ts'), 'utf8');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', msg);
  }
}
assert(home.includes('buildMetadata'), 'homepage uses buildMetadata');
assert(home.includes("path: '/'"), 'homepage canonical path');
assert(meta.includes('alternates: { canonical: url }'), 'buildMetadata emits canonical');
assert(dest.includes("journey.src === 'move'"), 'destinations module is gated');
assert(life.includes("links: []"), 'insurance-home has no unsolicited links');
if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('Insurance V2.1 journey checks passed');
