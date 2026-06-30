'use server';

import { reviewFormSchema, type ReviewFormValues } from '@/lib/validations/forms';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { getProviderBySlug } from '@/lib/providers/queries';

export type ReviewActionResult =
  | { success: true }
  | { success: false; error: string };

export async function submitReview(
  input: ReviewFormValues
): Promise<ReviewActionResult> {
  const parsed = reviewFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid form data',
    };
  }

  if (parsed.data.website) {
    return { success: true };
  }

  const provider = await getProviderBySlug(parsed.data.providerSlug);
  if (!provider) {
    return { success: false, error: 'Provider not found.' };
  }

  if (!isSupabaseConfigured()) {
    console.info('[submitReview] Supabase not configured — review logged locally', {
      provider: provider.slug,
      rating: parsed.data.rating,
    });
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from('reviews').insert({
      provider_id: provider.id,
      author_name: parsed.data.author,
      rating: parsed.data.rating,
      title: parsed.data.title,
      content: parsed.data.content,
      status: 'pending',
    });

    if (error) {
      console.error('[submitReview]', error.message);
      return { success: false, error: 'Unable to submit your review. Please try again.' };
    }

    return { success: true };
  } catch (err) {
    console.error('[submitReview]', err);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}