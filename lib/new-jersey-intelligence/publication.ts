/**
 * NJ-INS-003 — New Jersey Insurance Intelligence publication gate.
 * Individual producer directories are not published from this gate.
 */

export const NEW_JERSEY_INTELLIGENCE_GATE = {
  path: '/new-jersey',
  robotsIndex: true,
  sitemap: true,
  title: 'New Jersey Insurance Market & Regulatory Intelligence | InsuranceTrustHub',
  description:
    'Research New Jersey insurance using NJDOBI admitted-carrier, enforcement, examination, complaint, health-market, and residual-market evidence. Independent research. Not a ranking, recommendation, or Trust Score.',
} as const;

export const NJ_STATE_INTEL_VERSION = 'insurance-nj-state-intel-v1' as const;
export const NJ_INS_003_TASK = 'NJ-INS-003' as const;
export const CANONICAL_NJ_SNAPSHOT_FINGERPRINT =
  'bcab35631a0494038667647244863a9510f5c76a36495fd14217bb0afd2a59e5';
