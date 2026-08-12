/**
 * Offline QA for Phase 6C-2 FP gate (no API / no DB writes).
 *   npx tsx scripts/dfs/qa-places-fp-gate.ts
 */

import type { Provider } from '../../types/provider';
import type { ExternalBusinessCandidate } from '../../lib/enrichment/match';
import { scoreBusinessMatch } from '../../lib/enrichment/match';
import { evaluatePlacesFalsePositiveGate } from '../../lib/enrichment/places-fp-gate';

function stubProvider(partial: Partial<Provider> & { name: string; city: string }): Provider {
  return {
    id: 'qa',
    slug: 'qa',
    name: partial.name,
    type: 'agency',
    city: partial.city,
    state: partial.state ?? 'FL',
    phone: partial.phone ?? '3055551212',
    website: partial.website ?? null,
    verified: true,
    ...partial,
  } as Provider;
}

type Case = {
  label: string;
  expectAccept: boolean;
  expectWebsite?: boolean;
  provider: Provider;
  candidate: ExternalBusinessCandidate;
};

const cases: Case[] = [
  {
    label: 'BMW / auto dealer style',
    expectAccept: false,
    provider: stubProvider({
      name: 'BMW OF SOUTH FLORIDA LLC',
      city: 'Miami',
      phone: '3055550100',
    }),
    candidate: {
      name: 'BMW of South Florida',
      phone: '3055550100',
      city: 'Miami',
      state: 'FL',
      website: 'https://www.bmwofsouthflorida.com',
      types: ['car_dealer', 'point_of_interest'],
      primaryType: 'car_dealer',
    },
  },
  {
    label: 'AC contractor style',
    expectAccept: false,
    provider: stubProvider({
      name: 'ALWAYS WINTER AIR CONDITIONING & REFRIGERATION LLC',
      city: 'Fort Lauderdale',
      phone: '9545550199',
    }),
    candidate: {
      name: 'Always Winter Air Conditioning',
      phone: '9545550199',
      city: 'Fort Lauderdale',
      state: 'FL',
      website: 'https://alwayswinterac.com',
      types: ['general_contractor', 'hvac_contractor', 'point_of_interest'],
      primaryType: 'general_contractor',
    },
  },
  {
    label: 'Clear local insurance agency',
    expectAccept: true,
    expectWebsite: true,
    provider: stubProvider({
      name: 'BEE INSURANCE INC',
      city: 'Miami',
      phone: '3055550200',
    }),
    candidate: {
      name: 'Bee Insurance Inc',
      phone: '3055550200',
      city: 'Miami',
      state: 'FL',
      website: 'https://beeininsurance.com',
      types: ['insurance_agency', 'point_of_interest'],
      primaryType: 'insurance_agency',
    },
  },
  {
    label: 'Title agency',
    expectAccept: true,
    expectWebsite: true,
    provider: stubProvider({
      name: 'A-1 TITLE & ESCROW, INC.',
      city: 'Miami',
      phone: '3055550300',
    }),
    candidate: {
      name: 'A-1 Title & Escrow Inc',
      phone: '3055550300',
      city: 'Miami',
      state: 'FL',
      website: 'https://a1titleescrow.com',
      types: ['insurance_agency', 'finance', 'point_of_interest'],
      primaryType: 'insurance_agency',
    },
  },
  {
    label: 'Public adjuster',
    expectAccept: true,
    expectWebsite: true,
    provider: stubProvider({
      name: 'COASTAL PUBLIC ADJUSTERS LLC',
      city: 'Boca Raton',
      phone: '5615550400',
    }),
    candidate: {
      name: 'Coastal Public Adjusters LLC',
      phone: '5615550400',
      city: 'Boca Raton',
      state: 'FL',
      website: 'https://coastalpublicadjusters.com',
      types: ['insurance_agency', 'point_of_interest'],
      primaryType: 'insurance_agency',
    },
  },
  {
    label: 'Realty without insurance keywords',
    expectAccept: false,
    provider: stubProvider({
      name: 'BARBAR REALTY PARTNERS LLC DBA KELLER WILLIAMS',
      city: 'Boca Raton',
      phone: '5615550500',
    }),
    candidate: {
      name: 'Keller Williams Realty',
      phone: '5615550500',
      city: 'Boca Raton',
      state: 'FL',
      website: 'https://kwboca.com',
      types: ['real_estate_agency', 'point_of_interest'],
      primaryType: 'real_estate_agency',
    },
  },
  {
    label: 'Credit union without insurance signals',
    expectAccept: false,
    provider: stubProvider({
      name: 'BRIGHTSTAR CREDIT UNION',
      city: 'Sunrise',
      phone: '9545550600',
    }),
    candidate: {
      name: 'BrightStar Credit Union',
      phone: '9545550600',
      city: 'Sunrise',
      state: 'FL',
      website: 'https://brightstarcu.com',
      types: ['bank', 'finance', 'point_of_interest'],
      primaryType: 'bank',
    },
  },
  {
    label: 'Carrier corporate domain website strip',
    expectAccept: true,
    expectWebsite: false,
    provider: stubProvider({
      name: 'SUNSHINE INSURANCE AGENCY INC',
      city: 'Miami',
      phone: '3055550700',
    }),
    candidate: {
      name: 'Sunshine Insurance Agency',
      phone: '3055550700',
      city: 'Miami',
      state: 'FL',
      website: 'https://www.progressive.com',
      types: ['insurance_agency', 'point_of_interest'],
      primaryType: 'insurance_agency',
    },
  },
];

let failed = 0;
console.log('Phase 6C-2 FP gate QA\n');

for (const c of cases) {
  const match = scoreBusinessMatch(c.provider, c.candidate);
  const fp = evaluatePlacesFalsePositiveGate(c.provider, c.candidate, match);
  // Gate only runs when scorer accepts; if scorer rejects, overall reject
  const accept = match.accept && fp.acceptMatch;
  const websiteOk =
    accept &&
    fp.allowWebsite &&
    Boolean(c.candidate.website) &&
    !/progressive\.com/i.test(c.candidate.website ?? '');

  const acceptPass = accept === c.expectAccept;
  const websitePass =
    c.expectWebsite === undefined ||
    (c.expectAccept && websiteOk === c.expectWebsite) ||
    (!c.expectAccept && true);

  // For carrier case: accept match but website stripped
  let pass = acceptPass;
  if (c.label.includes('Carrier corporate')) {
    pass =
      match.accept &&
      fp.acceptMatch &&
      fp.allowWebsite === false &&
      c.expectWebsite === false;
  } else {
    pass = acceptPass && (c.expectWebsite === undefined || websitePass);
  }

  const status = pass ? 'PASS' : 'FAIL';
  if (!pass) failed++;
  console.log(
    `[${status}] ${c.label}\n` +
      `  scorer.accept=${match.accept} score=${match.score} conf=${match.confidence}\n` +
      `  fp.accept=${fp.acceptMatch} allowWebsite=${fp.allowWebsite}\n` +
      `  reject=${fp.rejectReason ?? '—'}\n` +
      `  soft=${fp.softWarnings.join(',') || '—'}\n`
  );
}

if (failed) {
  console.error(`QA FAILED: ${failed}/${cases.length}`);
  process.exit(1);
}
console.log(`QA OK: ${cases.length}/${cases.length}`);
