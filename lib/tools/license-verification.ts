import { US_STATES } from '@/lib/constants';

export interface StateLicenseDepartment {
  code: string;
  name: string;
  department: string;
  lookupUrl: string;
  notes?: string;
}

const LOOKUP_URLS: Record<string, { department: string; lookupUrl: string; notes?: string }> = {
  FL: {
    department: 'Florida Department of Financial Services',
    lookupUrl: 'https://licenseesearch.fldfs.com/',
    notes: 'Search by agent name, agency, or license number.',
  },
  TX: {
    department: 'Texas Department of Insurance',
    lookupUrl: 'https://www.tdi.texas.gov/agent/index.html',
  },
  NJ: {
    department: 'New Jersey Department of Banking and Insurance',
    lookupUrl: 'https://www.state.nj.us/dobi/DOBI_LicSearch/index.html',
    notes: 'Interactive licensee search; bulk organization export may require OPRA/SBS/NIPR.',
  },
  OH: {
    department: 'Ohio Department of Insurance',
    lookupUrl:
      'https://gateway.insurance.ohio.gov/UI/ODI.Agent.Public.UI/AgentSearch.mvc/DisplaySearch',
    notes: 'Agent/agency locator. Bulk agency lists: ODI Mailing List tool (business entities only).',
  },
  CA: {
    department: 'California Department of Insurance',
    lookupUrl: 'https://www.insurance.ca.gov/01-consumers/102-help-adv/',
  },
  NY: {
    department: 'New York Department of Financial Services',
    lookupUrl: 'https://myportal.dfs.ny.gov/web/guest-applications',
  },
  VT: {
    department: 'Vermont Department of Financial Regulation',
    lookupUrl: 'https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=VT',
    notes:
      'Official SBS licensee lookup. Quarterly lists: DFR spreadsheet document type (firms promoted; individuals staged only).',
  },
  NV: {
    department: 'Nevada Division of Insurance',
    lookupUrl: 'https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=NV',
    notes:
      'Official SBS licensee lookup. Bulk firm lists: NV DOI reports → Firms by License Type (not the individual producer list).',
  },
  NC: {
    department: 'North Carolina Department of Insurance',
    lookupUrl: 'https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=NC',
    notes:
      'Official SBS licensee lookup. Bulk agency lists: NC DOI SBS Report Generator (business entities only; paid per-row).',
  },
  IL: {
    department: 'Illinois Department of Insurance',
    lookupUrl: 'https://www.insurance.illinois.gov/Producer/ProducerHome',
  },
  MO: {
    department: 'Missouri Department of Commerce and Insurance',
    lookupUrl: 'https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=MO',
    notes:
      'Official SBS licensee lookup. Missouri has no ITH bulk inventory; agency listings require a manual claim plus official confirmation.',
  },
};

const NAIC_FALLBACK = 'https://content.naic.org/consumer.htm';

export function getStateLicenseDepartments(): StateLicenseDepartment[] {
  return US_STATES.map((state) => {
    const entry = LOOKUP_URLS[state.code];
    return {
      code: state.code,
      name: state.name,
      department: entry?.department ?? `${state.name} Department of Insurance`,
      lookupUrl: entry?.lookupUrl ?? NAIC_FALLBACK,
      notes: entry?.notes,
    };
  });
}

export function getLicenseDepartment(stateCode: string): StateLicenseDepartment | undefined {
  return getStateLicenseDepartments().find((d) => d.code === stateCode.toUpperCase());
}