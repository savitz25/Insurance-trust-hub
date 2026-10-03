'use server';

import { getProviderBySlug } from '@/lib/providers/queries';
import type { ParentHandoffResult, ParentIntent } from '@/lib/my-insurance/parent-adapter';
import { resolveInsuranceProviderIdentity } from '@/lib/my-insurance/parent-adapter';
import { stageSignedParentHandoff } from '@/lib/my-insurance/signed-handoff';

/**
 * Resolves a published agency from insurance.providers.
 * The browser may send slug, intent, and pageOpen. Identity claims are rejected.
 * No SQL write. No Ask call. The production action does not mint a parent token.
 */
export async function prepareInsuranceParentHandoffAction(input: {
  providerSlug: string;
  intent: ParentIntent;
  pageOpen: boolean;
  claimedProviderId?: string | null;
  claimedSourceIdentifier?: string | null;
  claimedJurisdiction?: string | null;
  claimedName?: string | null;
  claimedReturnPath?: string | null;
}): Promise<ParentHandoffResult> {
  const slug = input.providerSlug?.trim() ?? '';
  if (!slug || (input.intent !== 'save' && input.intent !== 'unsave')) {
    return { ok: false, reason: 'unresolved' };
  }
  if (input.pageOpen !== true) {
    return { ok: false, reason: 'page_closed' };
  }

  const provider = await getProviderBySlug(slug);
  const resolution = resolveInsuranceProviderIdentity({
    publishedSlug: provider?.slug ?? null,
    publishedId: provider?.id ?? null,
    licenses: provider?.licenses ?? null,
    statesLicensed: provider?.states_licensed ?? null,
    claimedProviderId: input.claimedProviderId,
    claimedSourceIdentifier: input.claimedSourceIdentifier,
    claimedJurisdiction: input.claimedJurisdiction,
    claimedName: input.claimedName,
    claimedReturnPath: input.claimedReturnPath,
  });
  return stageSignedParentHandoff({
    resolution,
    intent: input.intent,
    pageOpen: true,
    key: null,
  });
}
