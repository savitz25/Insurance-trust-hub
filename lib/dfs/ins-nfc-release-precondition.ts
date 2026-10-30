export type NfcReleasePrecondition = {
  computedFieldExistsOnTarget: boolean;
  privilegesReviewedBySupabaseSecurity: boolean;
  targetPostgrestOrderingSucceeded: boolean;
  applicationSwitchApproved: boolean;
  targetOrderHttpStatus: number | null;
  securityReviewRef: string;
  vercelPreviewIsRuntimeCertification: boolean;
  prDescriptionIsRuntimeCertification: boolean;
  githubMergeableIsApproval: boolean;
  disposableProofIsTargetCertification: boolean;
};

export function nfcReleasePreconditionAllowsSwitch(input: NfcReleasePrecondition): boolean {
  if (input.vercelPreviewIsRuntimeCertification) return false;
  if (input.prDescriptionIsRuntimeCertification) return false;
  if (input.githubMergeableIsApproval) return false;
  if (input.disposableProofIsTargetCertification) return false;
  if (input.computedFieldExistsOnTarget !== true) return false;
  if (input.privilegesReviewedBySupabaseSecurity !== true) return false;
  if (input.targetPostgrestOrderingSucceeded !== true) return false;
  if (input.applicationSwitchApproved !== true) return false;
  if (input.targetOrderHttpStatus !== 200) return false;
  if (input.securityReviewRef.trim() === '') return false;
  return true;
}
