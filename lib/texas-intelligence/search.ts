export const TX_AGENCY_LIMIT = 25;
export const TX_COMPANY_LIMIT = 25;

export type TxAgencyRow = [
  npn: string,
  name: string,
  city: string,
  state: string,
  zip: string,
  types: string,
  appointments: number,
  licenses: number,
  expMax: string,
];

export type TxAgencyFile = {
  label: string;
  as_of: string;
  count: number;
  fields: string[];
  rows: TxAgencyRow[];
  note: string;
};

export type TxCompanyRow = {
  naic: string;
  name: string;
  agency_appointments: number;
};

export type TxCompanyFile = {
  label: string;
  count: number;
  rows: TxCompanyRow[];
  note: string;
  as_of?: string;
};

export function filterTxAgencies(
  rows: TxAgencyRow[],
  query: { q?: string; npn?: string; state?: string; zip?: string; licenseClass?: string },
  limit = TX_AGENCY_LIMIT,
): TxAgencyRow[] {
  const q = (query.q || '').trim().toLowerCase();
  const npn = (query.npn || '').trim();
  const state = (query.state || '').trim().toUpperCase();
  const zip = (query.zip || '').trim();
  const licenseClass = (query.licenseClass || '').trim().toLowerCase();
  const out: TxAgencyRow[] = [];
  for (const row of rows) {
    if (npn && row[0] !== npn) continue;
    if (state && row[3] !== state) continue;
    if (zip && !row[4].startsWith(zip)) continue;
    if (licenseClass && !row[5].toLowerCase().includes(licenseClass)) continue;
    if (q) {
      const blob = `${row[1]} ${row[2]} ${row[0]}`.toLowerCase();
      if (!blob.includes(q)) continue;
    }
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

export function filterTxCompanies(
  rows: TxCompanyRow[],
  query: { q?: string; naic?: string },
  limit = TX_COMPANY_LIMIT,
): TxCompanyRow[] {
  const q = (query.q || '').trim().toLowerCase();
  const naic = (query.naic || '').trim();
  const out: TxCompanyRow[] = [];
  for (const row of rows) {
    if (naic && row.naic !== naic) continue;
    if (q && !row.name.toLowerCase().includes(q) && !row.naic.includes(q)) continue;
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}
