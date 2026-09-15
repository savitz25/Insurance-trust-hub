/**
 * TH-P0-INSURANCE-01 regression guard.
 *
 * Confirmed live production contradiction (fixed by this ticket):
 *   /providers/a-neal-torley-inc-l101006 publicly rendered a "62/100 Trust
 *   Score" and a "Government Standing sub-score: 88/100" derived in part
 *   from CMS/Medicare signals, even though the entity is a plain Independent
 *   Agency, not a Medicare-native entity — contradicting the network's
 *   "No paid ranking. No Trust Score." doctrine.
 *
 * This guard fails if:
 *  - the live provider page route re-imports/re-computes a decomposed or
 *    total TrustHub provider score;
 *  - the Government Verification (CMS/Medicare/NPI) panel becomes reachable
 *    from free-text description matching instead of a structured, source-
 *    backed signal (specialty tag / insurance type / NPI on file);
 *  - a proprietary "Trust score: X/100" style row returns to the provider
 *    compare view.
 *
 *   npm run check:th-p0-insurance-01
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  governmentVerificationApplicable,
  providerIsMedicareSpecialist,
} from '../lib/insurance/cms/resolve-government-verification';
import type { Provider } from '../types/provider';

const errors: string[] = [];
function assert(cond: unknown, msg: string) {
  if (!cond) errors.push(msg);
}

const root = join(__dirname, '..');
const providerPageSrc = readFileSync(
  join(root, 'app/providers/[slug]/page.tsx'),
  'utf8'
);
const compareViewSrc = readFileSync(
  join(root, 'components/my-insurance/provider-compare-view.tsx'),
  'utf8'
);

// --- No proprietary scoring wired into the live provider page ---
assert(
  !/computeProviderTrustScoreBreakdown|TrustScoreBreakdownPanel/.test(providerPageSrc),
  'provider page must not import/compute a TrustHub provider trust score'
);
assert(
  !/Trust Score breakdown|Government Standing sub-score/.test(providerPageSrc),
  'provider page must not render "Trust Score breakdown" or a Government Standing sub-score line'
);
assert(
  providerPageSrc.includes('governmentVerificationApplicable'),
  'provider page must gate the Government Verification panel on a structured signal'
);

// --- No proprietary "Trust score: X/100" row on the compare view ---
assert(
  !/trust_score/.test(compareViewSrc),
  'provider compare view must not render a raw trust_score field'
);

// --- isMedicareFocused must be structured-signal-only, never free-text ---
function baseProvider(overrides: Partial<Provider>): Provider {
  return {
    id: 'p1',
    slug: 'test-agency',
    name: 'Test Agency',
    city: 'Testville',
    state: 'FL',
    insurance_types: [],
    specialties: [],
    rating: 0,
    review_count: 0,
    is_verified: true,
    ...overrides,
  };
}

const plainAgencyMentioningMedicareInProse = baseProvider({
  specialties: ['Independent Agency'] as Provider['specialties'],
  insurance_types: [],
  short_description:
    'We help clients compare plans, including Medicare options, alongside auto and home coverage.',
});
assert(
  providerIsMedicareSpecialist(plainAgencyMentioningMedicareInProse) === false,
  'a plain agency that only mentions "Medicare" in free-text description must NOT be classified as Medicare-focused'
);
assert(
  governmentVerificationApplicable(plainAgencyMentioningMedicareInProse) === false,
  'the Government Verification panel must not apply to an agency whose only Medicare signal is free-text prose (this reproduces the confirmed a-neal-torley-inc contradiction)'
);

const structuredMedicareSpecialist = baseProvider({
  specialties: ['Medicare Specialists'] as Provider['specialties'],
});
assert(
  providerIsMedicareSpecialist(structuredMedicareSpecialist) === true,
  'a provider with the structured "Medicare Specialists" specialty tag must still be classified as Medicare-focused'
);
assert(
  governmentVerificationApplicable(structuredMedicareSpecialist) === true,
  'the Government Verification panel must still apply to a genuine, source-backed Medicare specialist'
);

const providerWithNpiOnFile = baseProvider({
  npi: '1234567890',
});
assert(
  governmentVerificationApplicable(providerWithNpiOnFile) === true,
  'an agency with a real NPI on file must still show Government Verification evidence'
);

const plainAgencyNoSignal = baseProvider({
  specialties: ['Independent Agency'] as Provider['specialties'],
});
assert(
  governmentVerificationApplicable(plainAgencyNoSignal) === false,
  'a plain agency with no Medicare/NPI signal at all must not show the Government Verification panel'
);

if (errors.length) {
  console.error('TH-P0-INSURANCE-01 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('TH-P0-INSURANCE-01 PASS');
