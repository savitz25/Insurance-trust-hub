/**
 * Deterministic canonical-name policy for confirmed-NPN agency entities.
 * Name is never an identity key. Do not use shortest or pure alphabetical pick.
 *
 * Rule: among CORE credentials, prefer source order FL > TX > OH > VT;
 * then the longest trimmed legal name (more complete); tie-break by license number.
 * If no core name exists, apply the same rule to all credentials.
 */

export const CANONICAL_NAME_POLICY =
  'core_then_source_priority_fl_tx_oh_vt;longest_trimmed_legal_name;license_number_tiebreak';

const SOURCE_RANK: Record<string, number> = {
  florida_dfs: 0,
  texas_tdi: 1,
  ohio_odi: 2,
  vermont_dfr: 3,
};

export type NamedCredential = {
  sourceDataset: string;
  legalName: string;
  licenseNumber: string;
  coreAgencyEligible: boolean;
};

export function sourceRank(sourceDataset: string): number {
  return SOURCE_RANK[sourceDataset] ?? 50;
}

export function selectCanonicalName(creds: NamedCredential[]): {
  legalName: string;
  displayName: string;
  sourceDataset: string;
  policy: string;
} {
  const named = creds.filter((c) => String(c.legalName || '').trim());
  const pool = named.filter((c) => c.coreAgencyEligible);
  const use = pool.length ? pool : named;
  if (!use.length) {
    return {
      legalName: 'UNKNOWN AGENCY',
      displayName: 'UNKNOWN AGENCY',
      sourceDataset: '',
      policy: CANONICAL_NAME_POLICY,
    };
  }
  use.sort((a, b) => {
    const sr = sourceRank(a.sourceDataset) - sourceRank(b.sourceDataset);
    if (sr !== 0) return sr;
    const ln = b.legalName.trim().length - a.legalName.trim().length;
    if (ln !== 0) return ln;
    return String(a.licenseNumber).localeCompare(String(b.licenseNumber));
  });
  const winner = use[0]!;
  const legalName = winner.legalName.trim();
  return {
    legalName,
    displayName: legalName,
    sourceDataset: winner.sourceDataset,
    policy: CANONICAL_NAME_POLICY,
  };
}
