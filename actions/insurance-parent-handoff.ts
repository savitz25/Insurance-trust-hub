'use server';

import { getProviderBySlug } from '@/lib/providers/queries';
import type { ParentIntent, PendingParentSync } from '@/lib/my-insurance/parent-adapter';
import { resolveInsuranceProviderIdentity } from '@/lib/my-insurance/parent-adapter';
import { productionParentGate, releaseAdmits } from '@/lib/my-insurance/production-gate';
import { productionHandoffDeps, stageProductionHandoff, stageSignedParentHandoff } from '@/lib/my-insurance/signed-handoff';
import type { HandoffIntent } from '@/lib/my-insurance/handoff-form';

export type InsuranceParentHandoffActionResult =
  | { ok: true; mode: 'device'; pending: PendingParentSync }
  | {
      ok: true;
      mode: 'continue';
      target: string;
      continuationRef: string;
      intent: HandoffIntent;
      expiresAt: number;
      watchCreated: false;
    }
  | { ok: false; reason: string };

/**
 * Resolves a published agency from insurance.providers.
 * The browser may send slug, intent, and pageOpen. Identity claims are rejected.
 * No SQL write. An admitted gate posts one signed closed manifest.
 * A missing signer returns unsigned and does not post with key: null.
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
}): Promise<InsuranceParentHandoffActionResult> {
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
  const gate = productionParentGate();
  if (!resolution.ok || !releaseAdmits(slug, gate)) {
    const staged = stageSignedParentHandoff({
      resolution,
      intent: input.intent,
      pageOpen: true,
      key: null,
    });
    if (!staged.ok) return staged;
    return { ok: true, mode: 'device', pending: staged.pending };
  }
  const deps = productionHandoffDeps();
  if (!deps.key || !deps.parent) return { ok: false, reason: 'unsigned' };
  const staged = await stageProductionHandoff({
    resolution,
    intent: input.intent,
    pageOpen: true,
    gate,
    key: deps.key,
    parent: deps.parent,
  });
  if (staged.state !== 'continue') return { ok: false, reason: staged.reason };
  return {
    ok: true,
    mode: 'continue',
    target: staged.target,
    continuationRef: staged.continuationRef,
    intent: staged.intent,
    expiresAt: staged.expiresAt,
    watchCreated: false,
  };
}
