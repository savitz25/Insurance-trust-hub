/**
 * Offline ops helper: print promotion gate status for sample payloads.
 * Does not invent licenses. Operators use admin UI + official DOI lookups.
 *
 * node scripts/ops-license-backfill-report.mjs
 * node scripts/ops-license-backfill-report.mjs path/to/batch.json
 *
 * batch.json format:
 * [
 *   {
 *     "providerId": "uuid",
 *     "name": "Example Agency",
 *     "licenseNumber": "A123456",
 *     "licenseState": "FL",
 *     "source": "FL DFS Licensee Search",
 *     "sourceUrl": "https://licenseesearch.fldfs.com/...",
 *     "checkedAt": "2026-08-08T15:00:00Z",
 *     "method": "manual",
 *     "identityMatchAccepted": true,
 *     "intent": "promote_indexable"
 *   }
 * ]
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function cleanLicenseNumber(raw) {
  const n = (raw ?? '').trim();
  if (!n) return null;
  if (/[✅✓✔❌]/.test(n)) return null;
  if (/\b(active|verified|pending)\b/i.test(n) && !/\d{3,}/.test(n)) return null;
  if (!/\d/.test(n)) return null;
  if (n.length < 3) return null;
  return n;
}

function evaluate(row) {
  const missing = [];
  const reasons = [];
  if (!cleanLicenseNumber(row.licenseNumber)) {
    missing.push('licenseNumber');
    reasons.push('no re-checkable license');
  }
  if (!row.source?.trim()) {
    missing.push('source');
    reasons.push('missing source');
  }
  if (!row.checkedAt) {
    missing.push('checkedAt');
    reasons.push('missing checkedAt');
  }
  if (!row.identityMatchAccepted) {
    missing.push('identityMatchAccepted');
    reasons.push('identity not accepted');
  }
  if (row.providerId?.startsWith('fallback-') || row.providerId?.includes('-agent-')) {
    return { class: 'seed', promote: false, reasons: ['seed entity'], missing };
  }
  if (missing.length) {
    return {
      class: cleanLicenseNumber(row.licenseNumber) ? 'pending_verification' : 'seed',
      promote: false,
      reasons,
      missing,
    };
  }
  if (row.intent === 'promote_indexable') {
    return { class: 'indexable_research', promote: true, reasons: ['gates pass'], missing: [] };
  }
  return { class: 'pending_verification', promote: false, reasons: ['saved pending'], missing: [] };
}

const batchPath = process.argv[2];
let batch = [];
if (batchPath && existsSync(batchPath)) {
  batch = JSON.parse(readFileSync(batchPath, 'utf8'));
} else {
  console.log('No batch file provided — printing process checklist only.\n');
  console.log(`See ${join(ROOT, 'docs/INSURANCE-PHASE-6B1-LICENSE-BACKFILL.md')}`);
  console.log('Admin workbench: /admin/license-backfill');
  console.log('Example batch path: ops/license-backfill-batch.example.json');
  process.exit(0);
}

let promoted = 0;
let pending = 0;
let suppressed = 0;
const failures = {};

for (const row of batch) {
  const r = evaluate(row);
  if (r.promote) promoted++;
  else if (r.class === 'pending_verification') pending++;
  else suppressed++;
  for (const reason of r.reasons) {
    failures[reason] = (failures[reason] || 0) + 1;
  }
  console.log(
    `${row.name || row.providerId}: ${r.class}${r.promote ? ' PROMOTE' : ''} — ${r.reasons.join('; ')}`
  );
}

console.log('\n--- Summary ---');
console.log(`reviewed: ${batch.length}`);
console.log(`would_promote: ${promoted}`);
console.log(`pending: ${pending}`);
console.log(`suppressed: ${suppressed}`);
console.log('reasons:', failures);
console.log(
  '\nNote: this script only validates batch JSON. Production writes go through /admin/license-backfill with Supabase admin credentials. Never invent license numbers.'
);
