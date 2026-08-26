/**
 * Denominator-safe metrics. Records ≠ credentials ≠ identities ≠ locations.
 */

import { normalizeNpn } from './npn';

export type RepeatedNpnRow = {
  jurisdiction?: string | null;
  npn?: string | null;
};

export type FloridaRepeatedNpnMetrics = {
  records: number;
  validNpnRows: number;
  distinctNpnIdentities: number;
  npnsWithMultipleCredentials: number;
  extraRowsBeyondFirstIdentity: number;
  rowsInRepeatedNpnGroups: number;
  percentRowsInRepeatedNpnGroups: number;
  percentDistinctNpnOfRecords: number;
  unsupportedClaim:
    'The ~79% figure is distinct-NPN identities divided by Florida records, not the share of rows that repeat an NPN.';
  definitions: {
    records: string;
    validNpnRows: string;
    distinctNpnIdentities: string;
    npnsWithMultipleCredentials: string;
    extraRowsBeyondFirstIdentity: string;
    rowsInRepeatedNpnGroups: string;
    percentRowsInRepeatedNpnGroups: string;
    percentDistinctNpnOfRecords: string;
  };
};

/**
 * Correct the INS-NAT-004 Florida “~79% repeated NPN” statement.
 *
 * 78,179 / 98,622 ≈ 79.3% is distinct valid-NPN identities per Florida records.
 * Rows that belong to an NPN with 2+ Florida credentials are ~22.3% of records.
 */
export function floridaRepeatedNpnMetrics(rows: RepeatedNpnRow[]): FloridaRepeatedNpnMetrics {
  const records = rows.length;
  const counts = new Map<string, number>();
  let validNpnRows = 0;
  for (const r of rows) {
    const npn = normalizeNpn(r.npn);
    if (!npn) continue;
    validNpnRows += 1;
    counts.set(npn, (counts.get(npn) ?? 0) + 1);
  }
  const distinctNpnIdentities = counts.size;
  let npnsWithMultipleCredentials = 0;
  let rowsInRepeatedNpnGroups = 0;
  for (const n of counts.values()) {
    if (n >= 2) {
      npnsWithMultipleCredentials += 1;
      rowsInRepeatedNpnGroups += n;
    }
  }
  const extraRowsBeyondFirstIdentity = validNpnRows - distinctNpnIdentities;
  return {
    records,
    validNpnRows,
    distinctNpnIdentities,
    npnsWithMultipleCredentials,
    extraRowsBeyondFirstIdentity,
    rowsInRepeatedNpnGroups,
    percentRowsInRepeatedNpnGroups: records === 0 ? 0 : rowsInRepeatedNpnGroups / records,
    percentDistinctNpnOfRecords: records === 0 ? 0 : distinctNpnIdentities / records,
    unsupportedClaim:
      'The ~79% figure is distinct-NPN identities divided by Florida records, not the share of rows that repeat an NPN.',
    definitions: {
      records: 'Florida source rows in the current extract (denominator for percentages).',
      validNpnRows: 'Florida rows whose NPN passes normalizeNpn (5–10 digits).',
      distinctNpnIdentities: 'Count of unique valid NPNs among Florida rows.',
      npnsWithMultipleCredentials: 'Count of those NPNs that appear on 2+ Florida rows.',
      extraRowsBeyondFirstIdentity:
        'validNpnRows − distinctNpnIdentities = extra location/credential rows beyond the first per NPN.',
      rowsInRepeatedNpnGroups:
        'Sum of Florida rows whose NPN appears at least twice. Includes the first row of each repeated NPN.',
      percentRowsInRepeatedNpnGroups:
        'rowsInRepeatedNpnGroups / records. This is the repeated-NPN row share (~22.3% on current extract).',
      percentDistinctNpnOfRecords:
        'distinctNpnIdentities / records. This is ~79.3% on current extract and is NOT a duplication rate.',
    },
  };
}
