export type CaEnforcementRow = [
  actionDate: string,
  organizationName: string,
  organizationType: string,
  enforcementAction: string,
  penaltyAmount: string,
  link: string,
];

export type CaEnforcementFile = {
  label: string;
  fields: string[];
  count: number;
  rows: CaEnforcementRow[];
};

export const CA_ENFORCEMENT_LIMIT = 40;

export function filterCaEnforcement(
  rows: CaEnforcementRow[],
  query: { q?: string; action?: string; year?: string },
  limit = CA_ENFORCEMENT_LIMIT,
): CaEnforcementRow[] {
  const q = (query.q || '').trim().toLowerCase();
  const action = (query.action || '').trim();
  const year = (query.year || '').trim();
  const out: CaEnforcementRow[] = [];
  for (const row of rows) {
    if (action && row[3] !== action) continue;
    if (year && !row[0].startsWith(year)) continue;
    if (q && !row[1].toLowerCase().includes(q) && !row[2].toLowerCase().includes(q)) continue;
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}
