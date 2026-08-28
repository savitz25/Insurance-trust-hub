/**
 * FL-INS-005 — Florida market intelligence semantics.
 * CHOICES ≠ quote. IRFS filing ≠ approval. Citizens ≠ general licensure.
 * Surplus eligibility ≠ admitted. NFIP listed ≠ certified.
 * County appointment ≠ service territory. No rankings. No Trust Scores.
 */
import { SOURCE_CLOCK } from './market-intelligence';

export const FL_MARKET_TASK = 'FL-INS-005';

export const CHOICES_SAFE_COPY =
  'Sample premium shown in Florida OIR CHOICES for this profile and location.';
export const NFIP_SAFE_COPY = 'Listed in FEMA/NFIP Agency Registry.';
export const MARKET_SHARE_SAFE_COPY =
  'Florida market share in the source-defined line and period.';

export function choicesPremiumIsQuote(): false {
  return false;
}
export function irfsFilingIsApproval(): false {
  return false;
}
export function citizensIsGeneralLicensure(): false {
  return false;
}
export function citizensAuthorizationIsDfsLicense(): false {
  return false;
}
export function surplusEligibilityIsAdmitted(): false {
  return false;
}
export function nfipRegistryIsCertification(): false {
  return false;
}
export function takeoutOfferIsCompletedAssumption(): false {
  return false;
}
export function citizensCountMayOmitDate(): false {
  return false;
}
export function floodMarketsMayAggregate(): false {
  return false;
}
export function dfsCountyAppointmentIngestedHere(): false {
  return false;
}

export const FL_MARKET_SOURCES = {
  mirReports: {
    authority: 'Florida Office of Insurance Regulation',
    portal: 'https://floir.gov/tools-and-data/residential-market-share-reports',
    wizard: 'https://qsrng.floir.gov/',
    wizardLegacy: 'https://apps.fldfs.com/QSRNG/Reports/ReportCriteriaWizard.aspx',
    statute: 'F.S. 624.424(10)',
    clock: SOURCE_CLOCK.MIR,
  },
  choices: {
    authority: 'Florida Office of Insurance Regulation',
    hub: 'https://floir.gov/consumers/choices-rate-comparison-search',
    homeowners: 'https://choices.floir.gov/pandc/homeowners',
    auto: 'https://choices.fldfs.com/pandc/auto',
    medigap: 'https://choices.floir.gov/mcws/CWSSearch',
    smallGroup: 'https://choices.fldfs.com/landh/SmallGroup',
    clock: SOURCE_CLOCK.CHOICES,
  },
  irfs: {
    authority: 'Florida Office of Insurance Regulation',
    publicSearch: 'https://irfssearch.floir.gov/',
    industry: 'https://irfs.floir.gov/',
    clock: SOURCE_CLOCK.IRFS,
    searchCap: 2500,
    filingsFrom: '2001-01-05',
  },
  citizens: {
    authority: 'Citizens Property Insurance Corporation',
    portal: 'https://www.citizensfla.com/',
    clock: SOURCE_CLOCK.CITIZENS,
  },
  fslso: {
    authority: 'Florida Surplus Lines Service Office',
    eligible: 'https://www.fslso.com/compliance/eligible-insurers',
    monthlyPremium:
      'https://www.fslso.com/docs/default-source/uploadedfiles/reports/fl-monthly-premium-report/monthly-fl-premium-report.pdf',
    oirSurplusDirectory: 'https://companysearch.myfloridacfo.gov/?data=SURPLUS%20LINES',
    clock: SOURCE_CLOCK.FSLSO,
  },
  nfip: {
    authority: 'FEMA National Flood Insurance Program',
    registryInfo: 'https://agents.floodsmart.gov/agency-registry',
    publicList: 'https://www.floodsmart.gov/flood-insurance-agencies',
    clock: SOURCE_CLOCK.NFIP,
  },
} as const;

export const FUTURE_FLORIDA_MODULES = [
  'Florida Insurance Market Overview',
  'Homeowners Market',
  'Auto Market',
  'Citizens / Residual Market',
  'Rate Filing Activity',
  'Sample Rate Comparisons',
  'Surplus Lines',
  'Flood / NFIP',
  'Health / ACA',
  'Medigap',
  'Life / Annuity',
  'Regulatory & Enforcement History',
  'Source Clock / Methodology',
] as const;
