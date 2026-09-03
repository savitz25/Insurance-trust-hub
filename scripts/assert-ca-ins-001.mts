import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const snap = JSON.parse(readFileSync(join(root, 'lib/california-intelligence/accepted-snapshot.json'), 'utf8'));
const pub = readFileSync(join(root, 'lib/california-intelligence/publication.ts'), 'utf8');
if (!existsSync(join(root, 'app/california/page.tsx'))) throw new Error('missing /california');
if (snap.fingerprint.length !== 64) throw new Error('fingerprint');
if (!pub.includes(snap.fingerprint)) throw new Error('fingerprint not gated');
if (snap.enforcement.rows !== 5435) throw new Error('enforcement rows');
if (snap.imr.rows !== 42749) throw new Error('imr rows');
if (snap.cdi_health_list.row_count !== 28) throw new Error('cdi list');
if (snap.publication.canonical !== 'https://www.insurancetrusthub.com/california') throw new Error('canonical');
console.log('assert-ca-ins-001 PASS', snap.fingerprint);
