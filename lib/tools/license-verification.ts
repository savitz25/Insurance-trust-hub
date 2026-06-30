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
  CA: {
    department: 'California Department of Insurance',
    lookupUrl: 'https://www.insurance.ca.gov/01-consumers/102-help-adv/',
  },
  NY: {
    department: 'New York Department of Financial Services',
    lookupUrl: 'https://myportal.dfs.ny.gov/web/guest-applications',
  },
  NC: {
    department: 'North Carolina Department of Insurance',
    lookupUrl: 'https://www.ncdoi.gov/consumers/helpful-links',
  },
  IL: {
    department: 'Illinois Department of Insurance',
    lookupUrl: 'https://www.insurance.illinois.gov/Producer/ProducerHome',
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