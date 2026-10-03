'use server';

import { getProviderBySlug } from '@/lib/providers/queries';
import {
  resolveInsuranceProviderIdentity,
  stageParentHandoff,
  type ParentHandoffResult,
} from '@/lib/my-insurance/parent-adapter';

/**
 * Resolves a published agency on the server.
 * The browser slug is only a lookup key. The native id and return path come from the row.
 * This action does not write SQL and does not call Ask.
 */
export async function prepareInsuranceParentHandoffAction(input: {
  providerSlug: string;
  clientSuppliedId?: string | null;
}): Promise<ParentHandoffResult> {
  const slug = input.providerSlug?.trim() ?? '';
  if (!slug) {
    return { ok: false, reason: 'unresolved' };
  }

  const provider = await getProviderBySlug(slug);
  return stageParentHandoff(
    resolveInsuranceProviderIdentity({
      publishedId: provider?.id ?? null,
      publishedSlug: provider?.slug ?? null,
      clientSuppliedId: input.clientSuppliedId ?? null,
      licenseState: provider?.license_state ?? null,
    }),
  );
}
