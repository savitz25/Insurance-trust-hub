'use server';

import { adminLoginSchema, adminProviderSchema } from '@/lib/validations/admin';
import {
  createProvider,
  deleteProvider,
  moderateReview,
  updateProvider,
} from '@/lib/admin/mutations';
import { schemaToFormData } from '@/lib/admin/provider-mapper';
import type { ReviewStatus } from '@/types/supabase';

export type AdminActionResult =
  | { success: true; id?: string; slug?: string }
  | { success: false; error: string };

export async function saveProviderAction(
  input: unknown,
  id?: string
): Promise<AdminActionResult> {
  const parsed = adminProviderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid data' };
  }

  try {
    const data = schemaToFormData(parsed.data);

    if (id) {
      const row = await updateProvider(id, data);
      return { success: true, id: row.id, slug: row.slug };
    }

    const row = await createProvider(data);
    return { success: true, id: row.id, slug: row.slug };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unable to save provider',
    };
  }
}

export async function deleteProviderAction(id: string): Promise<AdminActionResult> {
  if (!id) return { success: false, error: 'Provider ID required' };

  try {
    await deleteProvider(id);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unable to delete provider',
    };
  }
}

export async function moderateReviewAction(
  id: string,
  status: ReviewStatus
): Promise<AdminActionResult> {
  if (!id) return { success: false, error: 'Review ID required' };

  try {
    await moderateReview(id, status);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unable to update review',
    };
  }
}

export async function validateAdminLogin(password: string): Promise<boolean> {
  const parsed = adminLoginSchema.safeParse({ password });
  if (!parsed.success) return false;
  const secret = process.env.ADMIN_SECRET?.trim();
  return Boolean(secret && parsed.data.password === secret);
}

export async function runSecondaryEnrichmentAction(input: {
  providerId: string;
  runGoogle?: boolean;
  bbbUrl?: string;
  bbbRating?: string;
  bbbAccredited?: boolean;
  bbbIdentityMatchAccepted?: boolean;
  operatorNotes?: string;
}): Promise<AdminActionResult & { message?: string }> {
  try {
    const { runSecondaryEnrichment } = await import('@/lib/enrichment/pipeline');
    const result = await runSecondaryEnrichment({
      providerId: input.providerId,
      runGoogle: input.runGoogle,
      bbb:
        input.bbbUrl && input.bbbIdentityMatchAccepted
          ? {
              profileUrl: input.bbbUrl,
              rating: input.bbbRating,
              accredited: input.bbbAccredited,
              identityMatchAccepted: true,
              notes: input.operatorNotes,
            }
          : input.bbbUrl
            ? {
                profileUrl: input.bbbUrl,
                rating: input.bbbRating,
                accredited: input.bbbAccredited,
                identityMatchAccepted: false,
                notes: input.operatorNotes,
              }
            : null,
      operatorNotes: input.operatorNotes,
    });
    if (!result.eligible && result.google === 'skipped' && result.bbb === 'skipped') {
      return { success: false, error: result.reasons.join(' · ') };
    }
    return {
      success: true,
      message: `Google: ${result.google}; BBB: ${result.bbb}\n${result.reasons.join('\n')}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Enrichment failed',
    };
  }
}

export async function applyLicenseBackfillAction(input: {
  providerId: string;
  licenseNumber: string;
  licenseState: string;
  source: string;
  sourceUrl?: string;
  checkedAt: string;
  method: 'manual' | 'automated';
  notes?: string;
  identityMatchAccepted: boolean;
  intent: 'promote_indexable' | 'save_pending' | 'keep_suppressed';
}): Promise<AdminActionResult & { message?: string }> {
  try {
    const { applyLicenseBackfill } = await import('@/lib/ops/license-backfill');
    const result = await applyLicenseBackfill(input.providerId, {
      licenseNumber: input.licenseNumber,
      licenseState: input.licenseState,
      source: input.source,
      sourceUrl: input.sourceUrl,
      checkedAt: input.checkedAt,
      method: input.method,
      notes: input.notes,
      identityMatchAccepted: input.identityMatchAccepted,
      intent: input.intent,
    });
    if (!result.ok) {
      return { success: false, error: result.errors.join(' · ') };
    }
    return {
      success: true,
      message: `Saved as ${result.listingClass}${result.verified ? ' (verified)' : ''}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Backfill failed',
    };
  }
}