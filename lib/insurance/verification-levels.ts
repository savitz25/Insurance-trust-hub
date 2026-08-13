/**
 * Phase 0–1 — Insurance Trust Hub verification integrity.
 *
 * Hard rule: "State License Verified" requires an actual re-checkable license
 * number (not emoji status strings), state, and a source path for the user.
 * Never invent credentials or treat “FL-DFS Active ✅” as a license number.
 */

export type InsuranceVerificationLevel =
  /** Directory row exists; no usable license number yet */
  | 'identity_located'
  /** License number on file (state known); status may still be incomplete */
  | 'license_located'
  /** License number + verified flag + re-check path available */
  | 'license_rechecked';

export type InsuranceVerificationDisplay = {
  level: InsuranceVerificationLevel;
  /** Short badge label — never overclaims */
  badgeLabel: string;
  /** Soft badge when not fully re-checked */
  badgeVariant: 'verified' | 'located' | 'pending';
  /** One-line explanation for UI */
  summary: string;
  licenseNumber: string | null;
  licenseState: string | null;
  /** Display status — never invent Active without data */
  statusLabel: string;
  /** Regulator / source name when known */
  sourceLabel: string | null;
  /** Official lookup URL when resolvable */
  sourceUrl: string | null;
  lastCheckedLabel: string | null;
  /** True only for license_rechecked with real number */
  showLicenseVerifiedBadge: boolean;
};

/**
 * Reject pseudo-license strings (status badges, not numbers users can re-check).
 */
export function cleanLicenseNumber(raw: string | null | undefined): string | null {
  const n = (raw ?? '').trim();
  if (!n) return null;
  if (/^(n\/?a|none|unknown|pending|tbd|-)$/i.test(n)) return null;
  // Emoji / “Active ✅” style claims are not license numbers
  if (/[✅✓✔❌]/.test(n)) return null;
  if (/\b(active|verified|pending)\b/i.test(n) && !/\d{3,}/.test(n)) return null;
  // “FL-DFS”, “IL-DOI Active” without a numeric id
  if (/^(?:[A-Z]{2}[- ]?)?(?:DFS|DOI|NIPR|NAIC)\b/i.test(n) && !/\d{3,}/.test(n)) {
    return null;
  }
  // Require at least one digit for a re-checkable producer/agency id
  if (!/\d/.test(n)) return null;
  if (n.length < 3) return null;
  return n;
}

function formatLastChecked(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Resolve displayable verification level from listing fields.
 * `isVerified` alone without a license number is never enough for License Verified.
 */
export function resolveInsuranceVerification(params: {
  licenseNumber?: string | null;
  licenseState?: string | null;
  /** Editorial / admin flag that a state record was checked */
  isVerified?: boolean | null;
  /** Optional ISO last-checked date when we have a re-check audit trail */
  lastVerifiedAt?: string | null;
  /** Optional status from official record when known */
  licenseStatus?: string | null;
  /** Regulator department name */
  sourceLabel?: string | null;
  /** Official lookup URL */
  sourceUrl?: string | null;
}): InsuranceVerificationDisplay {
  const licenseNumber = cleanLicenseNumber(params.licenseNumber);
  const licenseState = (params.licenseState ?? '').trim().toUpperCase() || null;
  const flagged = Boolean(params.isVerified);
  const lastCheckedLabel = formatLastChecked(params.lastVerifiedAt);
  const sourceLabel = params.sourceLabel?.trim() || null;
  const sourceUrl = params.sourceUrl?.trim() || null;
  const statusFromData = (params.licenseStatus ?? '').trim() || null;

  const statusLabel = statusFromData
    ? statusFromData
    : licenseNumber
      ? 'Confirm status on official lookup'
      : 'Not shown';

  // Phase 6B1: hard verified badge requires number + flag + source + checkedAt
  const hasProvenance = Boolean(sourceLabel) && Boolean(lastCheckedLabel);
  if (licenseNumber && flagged && hasProvenance) {
    const parts = [
      `License ${licenseNumber}${licenseState ? ` (${licenseState})` : ''}`,
      `Status: ${statusLabel}`,
      sourceLabel ? `Source: ${sourceLabel}` : null,
      lastCheckedLabel ? `Last checked: ${lastCheckedLabel}` : null,
      'Re-check on the official regulator lookup before buying coverage.',
    ].filter(Boolean);
    return {
      level: 'license_rechecked',
      badgeLabel: 'State license verified',
      badgeVariant: 'verified',
      summary: parts.join(' · '),
      licenseNumber,
      licenseState,
      statusLabel,
      sourceLabel,
      sourceUrl,
      lastCheckedLabel,
      showLicenseVerifiedBadge: true,
    };
  }

  // Flagged verified without full provenance → soft "on file" / pending, not hard badge
  if (licenseNumber && flagged && !hasProvenance) {
    return {
      level: 'license_located',
      badgeLabel: 'License number on file',
      badgeVariant: 'located',
      summary: [
        `License ${licenseNumber}${licenseState ? ` (${licenseState})` : ''}`,
        'Verification pending full source + checkedAt provenance (Phase 6B1)',
        'Confirm status on the official state lookup.',
      ].join(' · '),
      licenseNumber,
      licenseState,
      statusLabel,
      sourceLabel,
      sourceUrl,
      lastCheckedLabel,
      showLicenseVerifiedBadge: false,
    };
  }

  if (licenseNumber) {
    return {
      level: 'license_located',
      badgeLabel: 'License number on file',
      badgeVariant: 'located',
      summary: [
        `License ${licenseNumber}${licenseState ? ` (${licenseState})` : ''}`,
        `Status: ${statusLabel}`,
        sourceLabel ? `Source: ${sourceLabel}` : null,
        'Not marked fully re-checked here — verify on the official state lookup.',
      ]
        .filter(Boolean)
        .join(' · '),
      licenseNumber,
      licenseState,
      statusLabel,
      sourceLabel,
      sourceUrl,
      lastCheckedLabel,
      showLicenseVerifiedBadge: false,
    };
  }

  if (flagged) {
    return {
      level: 'identity_located',
      badgeLabel: 'State record located',
      badgeVariant: 'pending',
      summary:
        'A state record may exist, but no re-checkable license number is shown. Do not treat this as fully verified — use the official state lookup.',
      licenseNumber: null,
      licenseState,
      statusLabel: 'License number pending',
      sourceLabel,
      sourceUrl,
      lastCheckedLabel,
      showLicenseVerifiedBadge: false,
    };
  }

  return {
    level: 'identity_located',
    badgeLabel: 'License number pending',
    badgeVariant: 'pending',
    summary:
      'No re-checkable license number is shown on this listing yet. Confirm licensing on the official state regulator site before sharing personal data.',
    licenseNumber: null,
    licenseState,
    statusLabel: 'Not shown',
    sourceLabel,
    sourceUrl,
    lastCheckedLabel,
    showLicenseVerifiedBadge: false,
  };
}

/** Prefer precise language — never “NAIC Verified / DOI Verified” without a number. */
export function licenseVerifiedPhrase(level: InsuranceVerificationLevel): string {
  if (level === 'license_rechecked') return 'State license verified';
  if (level === 'license_located') return 'License number on file';
  return 'License number pending';
}

/**
 * Response-time and similar metrics: only show when measured or explicitly
 * provider-reported. Unknown provenance → suppress.
 */
export function shouldDisplayResponseTime(params: {
  hours?: number | null;
  /** 'measured' | 'provider_reported' | unknown */
  provenance?: 'measured' | 'provider_reported' | null;
}): { show: boolean; label?: string } {
  const h = params.hours;
  if (h == null || !Number.isFinite(h) || h <= 0) return { show: false };
  if (params.provenance === 'measured') {
    return { show: true, label: `Avg response (measured): <${h}h` };
  }
  if (params.provenance === 'provider_reported') {
    return { show: true, label: `Avg response (provider-reported): <${h}h` };
  }
  // No provenance — suppress (Phase 0 integrity)
  return { show: false };
}

/**
 * First-party / catalog reviews: prefer 0 over questionable synthetic highlights.
 */
export function shouldDisplayReviewHighlight(
  highlight: string | null | undefined
): boolean {
  const t = (highlight ?? '').trim();
  if (t.length < 24) return false;
  // Generic template-looking blurbs without attribution
  if (/great service|highly recommend|best agent/i.test(t) && t.length < 80) {
    return false;
  }
  return true;
}

/** Awards / recognition only when non-empty and not vague “top” filler. */
export function shouldDisplayAwards(awards: string[] | null | undefined): boolean {
  if (!awards?.length) return false;
  return awards.some((a) => {
    const t = a.trim();
    if (t.length < 4) return false;
    if (/^top\s+\d+/i.test(t) && !/\b\d{4}\b/.test(t)) return false;
    return true;
  });
}
