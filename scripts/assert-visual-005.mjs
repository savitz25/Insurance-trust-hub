/**
 * VISUAL-005 Insurance network shell — source contract.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const failures = [];
const assert = (cond, msg) => {
  if (!cond) failures.push(msg);
};

const tokens = read('lib/design/trusthub-visual-standard.ts');
const mark = read('components/insurance-network-mark.tsx');
const css = read('app/globals.css');
const nav = read('components/navbar.tsx');
const logo = read('components/BrandLogo.tsx');
const switcher = read('components/switch-hub-menu.tsx');
const registry = read('lib/network/registry.ts');
const layout = read('app/layout.tsx');
const icon = read('app/icon.svg');
const shield = read('public/brand/insurance-trust-hub-icon.svg');

assert(tokens.includes('2026.08.21-visual-v1'), 'chassis version');
assert(tokens.includes("insurance: '#0284C7'"), 'Insurance Shield Blue accent');
assert(mark.includes('strokeWidth="2.4"'), 'canonical stroke 2.4');
assert(mark.includes('r="2.5"'), 'canonical outer dots');
assert(mark.includes('#0284C7'), 'Insurance bracket accent');
assert(css.includes('--th-header-desktop: 69px'), '69px desktop header');
assert(css.includes('--th-header-tablet: 65px'), '65px tablet');
assert(css.includes('--th-header-mobile: 57px'), '57px mobile');
assert(css.includes('--th-logo-desktop: 36px'), '36px logo');
assert(css.includes('--th-control: 44px'), '44px controls');
assert(css.includes('--th-shell-max: 1200px'), '1200 shell');
assert(!css.includes('backdrop-filter'), 'no backdrop-filter on shell');
assert(!layout.includes('AskNetworkBar'), 'AskNetworkBar removed from layout');
assert(nav.includes('th-header'), 'reference header class');
assert(nav.includes('variant="embedded"'), 'Switch Hub in drawer');
assert(!nav.includes('compact'), 'no compact Switch Hub in product header');
assert(logo.includes('InsuranceNetworkMark'), 'tight SVG mark');
assert(!logo.includes('hub-logo-slot'), 'PNG header lockup removed');
assert(switcher.includes('switcherEntries()'), 'registry order');
assert(switcher.includes('ASK TRUST HUB NETWORK'), 'network panel title');
assert(switcher.includes('aria-current'), 'aria-current');
assert(registry.includes("CURRENT_NETWORK_HUB_ID: NetworkHubId = 'insurance'"), 'current hub is insurance');
assert(layout.includes('data-th-chassis'), 'chassis stamp');
assert(layout.includes('id="main-content"'), 'skip target');
assert(icon.includes('stroke-width="2.4"'), 'favicon SVG canonical');
assert(shield.includes('L56 52') || shield.includes('M32 8'), 'shield asset retained as specialist icon');

const order = ["'ask'", "'move'", "'lender'", "'insurance'", "'contractor'", "'senior'", "'investor'"];
let last = -1;
for (const id of order) {
  const i = registry.indexOf(`id: ${id}`);
  assert(i > last, `registry order ${id}`);
  last = i;
}

if (failures.length) {
  console.error('VISUAL-005 assertions failed:');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log('VISUAL-005 Insurance network-shell assertions passed.');
