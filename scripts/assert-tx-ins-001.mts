import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CANONICAL_TX_SNAPSHOT_FINGERPRINT } from '../lib/texas-intelligence/publication.ts';
import { txJsonLdHasForbiddenRatings, buildTexasInsuranceJsonLd } from '../lib/texas-intelligence/jsonld.ts';
import { filterTxAgencies, filterTxCompanies } from '../lib/texas-intelligence/search.ts';

const root = process.cwd();
const snap = JSON.parse(readFileSync(join(root, 'lib/texas-intelligence/accepted-snapshot.json'), 'utf8'));
const pub = readFileSync(join(root, 'lib/texas-intelligence/publication.ts'), 'utf8');
if (!existsSync(join(root, 'app/texas/page.tsx'))) throw new Error('missing /texas');
if (snap.fingerprint.length !== 64) throw new Error('fingerprint');
if (snap.fingerprint !== CANONICAL_TX_SNAPSHOT_FINGERPRINT) throw new Error('fingerprint gate');
if (!pub.includes(snap.fingerprint)) throw new Error('fingerprint not gated');
if (snap.agencies.rows !== 56625) throw new Error('agency rows');
if (snap.agencies.distinct_npn !== 43597) throw new Error('npn');
if (snap.appointments.rows !== 622019) throw new Error('appointments');
if (snap.appointments.distinct_naic !== 1414) throw new Error('naic');
if (snap.person_directory_public !== false) throw new Error('people');
if (snap.publication.canonical !== 'https://www.insurancetrusthub.com/texas') throw new Error('canonical');
if (txJsonLdHasForbiddenRatings(buildTexasInsuranceJsonLd(snap))) throw new Error('ratings schema');
const sample = filterTxAgencies(
  [['1', 'ALPHA AGENCY', 'AUSTIN', 'TX', '78701', 'General Lines Agency', 3, 1, '2028-01-01']],
  { q: 'alpha', state: 'TX' },
);
if (sample.length !== 1) throw new Error('agency filter');
const cos = filterTxCompanies([{ naic: '12345', name: 'EXAMPLE INSURANCE COMPANY', agency_appointments: 9 }], {
  naic: '12345',
});
if (cos.length !== 1) throw new Error('company filter');
if (!existsSync(join(root, 'app/california/page.tsx'))) throw new Error('ca regression');
if (!existsSync(join(root, 'app/new-jersey/page.tsx'))) throw new Error('nj regression');
if (!existsSync(join(root, 'app/florida/page.tsx'))) throw new Error('fl regression');
if (!existsSync(join(root, 'app/claim-listing/page.tsx'))) throw new Error('claim regression');
console.log('assert-tx-ins-001 PASS', snap.fingerprint);
