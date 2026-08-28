/**
 * FL-INS-003 fail-closed appointer bridge tests.
 *   npm run check:fl-ins-003
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { FL_DIGIT_COINCIDENCES, flDfsNumberIsNaic } from '../lib/national/appointer-crosswalk';
import { dfsAppointingNumberEqualsFlCompanyCode } from '../lib/national/fl-oir-company';
import {
  decideFlAppointerBridge,
  dfsNumberIsNaic,
  dfsNumberIsFlCompanyCode,
  nameOnlyCreatesBridge,
  addressOnlyCreatesBridge,
  phoneOnlyCreatesBridge,
  digitCoincidenceCreatesBridge,
  nonInsurerAppointerAttachesToLegalInsurer,
  agencyAppointedByShortcutToLegalInsurer,
  countyInferenceFromAppointment,
  reviewRequiredCreatesCanonicalBridge,
} from '../lib/national/fl-appointer-bridge';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const reports = join(root, 'data/reports');
function load(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(reports, name), 'utf8')) as Record<string, unknown>;
}

assert(existsSync(join(root, 'docs/florida/FL-INS-003-source-audit.md')), 'audit');
assert(existsSync(join(root, 'docs/florida/FL-INS-003-appointer-identity-contract.md')), 'contract');
assert(existsSync(join(root, 'docs/florida/FL-INS-003-bridge-methodology.md')), 'method');
assert(existsSync(join(root, 'docs/florida/FL-INS-003-public-records-request.md')), 'prr');

const keys = new Set(['legal-insurer:naic:12345']);
assert(dfsNumberIsNaic() === false && flDfsNumberIsNaic() === false, '1 dfs!=naic');
assert(dfsNumberIsFlCompanyCode() === false && dfsAppointingNumberEqualsFlCompanyCode() === false, '2 dfs!=flcode');
const same = decideFlAppointerBridge({
  dfsAppointingEntityNumber: '33438',
  sameRecordNaic: '12345',
  legalInsurerKeys: keys,
});
assert(same.action === 'bridge' && same.confidence === 'CONFIRMED', '3 same-record naic');
const chain = decideFlAppointerBridge({
  dfsAppointingEntityNumber: '33438',
  sameRecordFlCompanyCode: '03047',
  flCodeAlreadyConfirmedToNaic: '12345',
  legalInsurerKeys: keys,
});
assert(chain.action === 'bridge', '4 fl-code chain');
const fein = decideFlAppointerBridge({
  dfsAppointingEntityNumber: '33438',
  dfsFein: '123456789',
  oirFein: '12-3456789',
  feinUniqueToOneLegalInsurer: true,
  feinUniqueToOneDfsAppointer: true,
  flCodeAlreadyConfirmedToNaic: '12345',
  legalInsurerKeys: keys,
});
assert(fein.action === 'bridge' && fein.matchBasis.includes('fein'), '5 unique fein');
const name = decideFlAppointerBridge({
  dfsAppointingEntityNumber: '33438',
  nameOnlyNaic: '12345',
  legalInsurerKeys: keys,
});
assert(name.action === 'hold' && name.confidence === 'REVIEW_REQUIRED', '6 name rejected');
assert(nameOnlyCreatesBridge() === false, '6b');
assert(addressOnlyCreatesBridge() === false, '7');
assert(phoneOnlyCreatesBridge() === false, '8');
const dig = decideFlAppointerBridge({
  dfsAppointingEntityNumber: '10003',
  digitCoincidenceNaic: '10003',
  legalInsurerKeys: keys,
});
assert(dig.action === 'hold' && digitCoincidenceCreatesBridge() === false, '9 digit');
const multi = decideFlAppointerBridge({
  dfsAppointingEntityNumber: '33438',
  sameRecordNaic: '12345',
  candidateCount: 2,
  legalInsurerKeys: keys,
});
assert(multi.action === 'hold', '10 multi-target');
assert(nonInsurerAppointerAttachesToLegalInsurer() === false, '11');
assert(FL_DIGIT_COINCIDENCES.length === 17 && reviewRequiredCreatesCanonicalBridge() === false, '12');
assert(agencyAppointedByShortcutToLegalInsurer() === false, 'agency shortcut');
assert(countyInferenceFromAppointment() === false, '20 county');
assert(mayPublishEntityKind('legal_insurer') === false, '16 public 0');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'people');

const recon = load('fl-ins-003-reconciliation.json');
const pub = load('fl-ins-003-publication-regression.json');
const verd = load('fl-ins-003-verdict.json');
const coin = load('fl-ins-003-17-coincidences.json');
assert(recon.EXPECTED_CONFIRMED === 0 && recon.INSERTED === 0 && recon.MISSING === 0, '18 expected=prod 0');
assert(recon.WRONG_TARGET === 0 && recon.DUPLICATE === 0, 'wrong/dup');
assert(coin.still_review === 17 && coin.confirmed === 0, '12 coincidences');
assert(pub.pass === true, 'regression');
const after = pub.after as Record<string, unknown>;
assert(after.appointed_by === 2680, '13 appointed_by');
assert(after.legal_insurers === 6185, '15 legal');
assert(after.appointer_resolves_to_fl === 0, 'N zero');
assert(after.fl_oir_company_code === 1897, 'oir ids');
assert(verd.started_004 === false, 'no 004');
const py = readFileSync(join(root, 'scripts/national/fl-ins-003.py'), 'utf8');
assert(!/\.insert\(/.test(py) || /none confirmed|no-op/.test(py), 'no insert path used');
assert(!/APPOINTED_TO/.test(py) || /Do not rewrite/.test(readFileSync(join(root, 'docs/florida/FL-INS-003-appointer-identity-contract.md'), 'utf8') + py), '14 person');

if (errors.length) {
  console.error('FL-INS-003 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('FL-INS-003 PASS fail-closed appointer bridge tests=20');
