'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  getAuthenticatedUser,
  requireAuthenticatedUser,
} from '@/lib/my-insurance/auth';
import { ensureUserProfile } from '@/lib/my-insurance/ensure-profile';
import type {
  CalculatorSnapshot,
  CalculatorToolId,
  ComparisonWithItems,
  DrugBasketItemInput,
  DrugBasketItemRow,
  DrugBasketWithItems,
  GuestSavedProvider,
  MyInsuranceDashboardData,
  MyInsuranceReviewRow,
  SavedCalculatorResultRow,
  SavedProviderRow,
} from '@/lib/my-insurance/types';
import { CALCULATOR_LABELS } from '@/lib/my-insurance/types';
import {
  COMPARE_PATH,
  DRUG_BASKET_PATH,
  MAX_COMPARE_PROVIDERS,
  MY_INSURANCE_PATH,
} from '@/lib/my-insurance/constants';
import {
  sendComparisonSummaryEmail,
  sendDrugBasketEmail,
  sendReviewSubmittedEmail,
  sendSavedCalculatorEmail,
  sendSavedProviderEmail,
  sendWelcomeEmail,
} from '@/lib/my-insurance/emails';
import { getProviderBySlug } from '@/lib/providers/queries';
// provider lookup for reviews

/**
 * ITH tables (saved_providers, drug_baskets, ...) live on the Insurance Supabase project
 * and are not in Move monorepo generated Database types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insuranceDb(): Promise<any> {
  return (await createClient()) as any;
}

export async function ensureUserProfileAction(): Promise<{ ok: boolean }> {
  const user = await getAuthenticatedUser();
  if (!user) return { ok: false };
  const supabase = await createClient();
  await ensureUserProfile(supabase, user);
  return { ok: true };
}

export async function saveProviderAction(input: {
  providerSlug: string;
  providerName: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await insuranceDb();
    await ensureUserProfile(await createClient(), user);

    const { error } = await supabase.from('saved_providers').upsert(
      {
        user_id: user.id,
        provider_slug: input.providerSlug,
        provider_name: input.providerName,
      },
      { onConflict: 'user_id,provider_slug' }
    );

    if (error) {
      console.error('[my-insurance] saveProvider', error.message);
      return { ok: false, error: 'Could not save provider' };
    }

    revalidatePath(MY_INSURANCE_PATH);
    revalidatePath(`/providers/${input.providerSlug}`);

    if (user.email) {
      void sendSavedProviderEmail({
        to: user.email,
        providerName: input.providerName,
        providerSlug: input.providerSlug,
      }).catch((err) => console.error('[my-insurance] save email', err));
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function removeProviderAction(
  providerSlug: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await insuranceDb();
    const { error } = await supabase
      .from('saved_providers')
      .delete()
      .eq('user_id', user.id)
      .eq('provider_slug', providerSlug);

    if (error) return { ok: false, error: 'Could not remove' };
    revalidatePath(MY_INSURANCE_PATH);
    revalidatePath(`/providers/${providerSlug}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function mergeGuestProvidersAction(
  guests: GuestSavedProvider[]
): Promise<{ ok: true; merged: number } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    if (!guests.length) return { ok: true, merged: 0 };
    const supabase = await insuranceDb();
    await ensureUserProfile(await createClient(), user);

    let merged = 0;
    for (const g of guests) {
      const { error } = await supabase.from('saved_providers').upsert(
        {
          user_id: user.id,
          provider_slug: g.providerSlug,
          provider_name: g.providerName,
        },
        { onConflict: 'user_id,provider_slug' }
      );
      if (!error) merged += 1;
    }

    revalidatePath(MY_INSURANCE_PATH);
    return { ok: true, merged };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

async function getOrCreatePrimaryBasket(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  name = 'My prescriptions'
): Promise<{ id: string } | null> {
  const { data: existing } = await supabase
    .from('drug_baskets')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing?.id) return { id: existing.id as string };

  const { data: created, error } = await supabase
    .from('drug_baskets')
    .insert({ user_id: userId, name })
    .select('id')
    .single();

  if (error || !created?.id) {
    console.error('[my-insurance] create basket', error?.message);
    return null;
  }
  return { id: created.id as string };
}

/** Replace primary basket items with the given list (one active basket). */
export async function saveDrugBasketAction(input: {
  items: DrugBasketItemInput[];
  basketName?: string;
  sendEmail?: boolean;
}): Promise<{ ok: true; basketId: string } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    if (!input.items.length) {
      return { ok: false, error: 'Add at least one medication before saving.' };
    }
    const supabase = await insuranceDb();
    await ensureUserProfile(await createClient(), user);

    const basket = await getOrCreatePrimaryBasket(
      supabase,
      user.id,
      input.basketName?.trim() || 'My prescriptions'
    );
    if (!basket) return { ok: false, error: 'Could not create basket' };

    if (input.basketName?.trim()) {
      await supabase
        .from('drug_baskets')
        .update({ name: input.basketName.trim(), updated_at: new Date().toISOString() })
        .eq('id', basket.id)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('drug_baskets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', basket.id)
        .eq('user_id', user.id);
    }

    await supabase.from('drug_basket_items').delete().eq('basket_id', basket.id);

    const rows = input.items.map((item, index) => ({
      basket_id: basket.id,
      name: item.name.trim(),
      strength: item.strength.trim(),
      form: (item.form || 'Tablet').trim() || 'Tablet',
      dosage: item.dosage.trim(),
      quantity: item.quantity?.trim() || null,
      notes: item.notes?.trim() || null,
      sort_order: item.sort_order ?? index,
    }));

    const { error: insertErr } = await supabase.from('drug_basket_items').insert(rows);
    if (insertErr) {
      console.error('[my-insurance] basket items', insertErr.message);
      return { ok: false, error: 'Could not save medications' };
    }

    revalidatePath(MY_INSURANCE_PATH);
    revalidatePath(DRUG_BASKET_PATH);

    if (input.sendEmail !== false && user.email) {
      void sendDrugBasketEmail({
        to: user.email,
        basketName: input.basketName?.trim() || 'My prescriptions',
        items: rows.map((r) => ({
          name: r.name,
          strength: r.strength,
          form: r.form,
          dosage: r.dosage,
          quantity: r.quantity,
          notes: r.notes,
        })),
      }).catch((err) => console.error('[my-insurance] basket email', err));
    }

    return { ok: true, basketId: basket.id };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function deleteDrugBasketAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await insuranceDb();
    const { error } = await supabase.from('drug_baskets').delete().eq('user_id', user.id);
    if (error) return { ok: false, error: 'Could not delete basket' };
    revalidatePath(MY_INSURANCE_PATH);
    revalidatePath(DRUG_BASKET_PATH);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function removeDrugBasketItemAction(
  itemId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await insuranceDb();
    const basket = await getOrCreatePrimaryBasket(supabase, user.id);
    if (!basket) return { ok: false, error: 'Basket not found' };

    const { error } = await supabase
      .from('drug_basket_items')
      .delete()
      .eq('id', itemId)
      .eq('basket_id', basket.id);

    if (error) return { ok: false, error: 'Could not remove medication' };

    await supabase
      .from('drug_baskets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', basket.id);

    revalidatePath(MY_INSURANCE_PATH);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function emailDrugBasketAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const user = await requireAuthenticatedUser();
    if (!user.email) return { ok: false, error: 'No email on account' };
    const data = await getMyInsuranceDashboardData();
    const basket = data?.drugBasket;
    if (!basket?.items.length) return { ok: false, error: 'No medications to email' };

    const sent = await sendDrugBasketEmail({
      to: user.email,
      basketName: basket.name,
      items: basket.items.map((i) => ({
        name: i.name,
        strength: i.strength,
        form: i.form,
        dosage: i.dosage,
        quantity: i.quantity,
        notes: i.notes,
      })),
    });
    if (!sent) return { ok: false, error: 'Email could not be sent' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function saveCalculatorResultAction(input: {
  calculatorId: CalculatorToolId;
  title: string;
  snapshot: CalculatorSnapshot;
  sendEmail?: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await insuranceDb();
    await ensureUserProfile(await createClient(), user);

    const title =
      input.title.trim() ||
      CALCULATOR_LABELS[input.calculatorId] ||
      'Saved calculator result';

    const snapshot: CalculatorSnapshot = {
      ...input.snapshot,
      sourcePath:
        input.snapshot.sourcePath ||
        (input.calculatorId === 'aca_subsidy'
          ? '/calculators/aca-subsidy'
          : input.calculatorId === 'cost_estimator'
            ? '/tools/cost-estimator'
            : '/tools'),
    };

    const { data, error } = await supabase
      .from('saved_calculator_results')
      .insert({
        user_id: user.id,
        calculator_id: input.calculatorId,
        title,
        snapshot: snapshot as unknown as Record<string, unknown>,
      })
      .select('id')
      .single();

    if (error || !data?.id) {
      console.error('[my-insurance] save calculator', error?.message);
      return { ok: false, error: 'Could not save result' };
    }

    revalidatePath(MY_INSURANCE_PATH);

    if (input.sendEmail !== false && user.email) {
      void sendSavedCalculatorEmail({
        to: user.email,
        toolLabel: CALCULATOR_LABELS[input.calculatorId] || title,
        title,
        summaryText: snapshot.summaryText || title,
        sourcePath: snapshot.sourcePath,
      }).catch((err) => console.error('[my-insurance] calc email', err));
    }

    return { ok: true, id: data.id as string };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function deleteCalculatorResultAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await insuranceDb();
    const { error } = await supabase
      .from('saved_calculator_results')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { ok: false, error: 'Could not delete' };
    revalidatePath(MY_INSURANCE_PATH);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function getMyInsuranceDashboardData(): Promise<MyInsuranceDashboardData | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const supabase = await insuranceDb();
  await ensureUserProfile(await createClient(), user);

  const [providersRes, basketsRes, calcRes, comparisonsRes, reviewsRes] =
    await Promise.all([
      supabase
        .from('saved_providers')
        .select('id,user_id,provider_slug,provider_name,notes,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('drug_baskets')
        .select('id,user_id,name,created_at,updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('saved_calculator_results')
        .select('id,user_id,calculator_id,title,snapshot,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('provider_comparisons')
        .select('id,user_id,title,snapshot_json,created_at,updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20),
      supabase
        .from('reviews')
        .select(
          'id,provider_id,user_id,author_name,rating,title,content,coverage_type,status,created_at'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

  let drugBasket: DrugBasketWithItems | null = null;
  if (basketsRes.data?.id) {
    const { data: items } = await supabase
      .from('drug_basket_items')
      .select(
        'id,basket_id,name,strength,form,dosage,quantity,notes,sort_order,created_at'
      )
      .eq('basket_id', basketsRes.data.id)
      .order('sort_order', { ascending: true });

    drugBasket = {
      ...(basketsRes.data as Omit<DrugBasketWithItems, 'items'>),
      items: (items ?? []) as DrugBasketItemRow[],
    };
  }

  const comparisons: ComparisonWithItems[] = [];
  for (const c of comparisonsRes.data ?? []) {
    const { data: items } = await supabase
      .from('provider_comparison_items')
      .select('id,comparison_id,provider_slug,provider_name,sort_order,created_at')
      .eq('comparison_id', c.id)
      .order('sort_order', { ascending: true });
    comparisons.push({
      ...c,
      snapshot_json: (c.snapshot_json ?? {}) as Record<string, unknown>,
      items: items ?? [],
    });
  }

  const myReviews: MyInsuranceReviewRow[] = [];
  for (const r of reviewsRes.data ?? []) {
    let provider_slug: string | undefined;
    let provider_name: string | undefined;
    if (r.provider_id) {
      const { data: prov } = await supabase
        .from('providers')
        .select('slug,name')
        .eq('id', r.provider_id)
        .maybeSingle();
      provider_slug = prov?.slug;
      provider_name = prov?.name;
    }
    myReviews.push({
      ...r,
      provider_slug,
      provider_name,
    });
  }

  if (providersRes.error) {
    console.error('[my-insurance] dashboard providers', providersRes.error.message);
  }
  if (calcRes.error) {
    console.error('[my-insurance] dashboard calc', calcRes.error.message);
  }
  if (comparisonsRes.error) {
    console.error('[my-insurance] dashboard comparisons', comparisonsRes.error.message);
  }
  if (reviewsRes.error) {
    console.error('[my-insurance] dashboard reviews', reviewsRes.error.message);
  }

  return {
    savedProviders: (providersRes.data ?? []) as SavedProviderRow[],
    drugBasket,
    calculatorResults: (calcRes.data ?? []).map(
      (row: SavedCalculatorResultRow & { snapshot?: unknown }) => ({
        ...row,
        snapshot: (row.snapshot ?? {}) as CalculatorSnapshot,
      })
    ) as SavedCalculatorResultRow[],
    comparisons,
    myReviews,
    email: user.email ?? null,
  };
}

export async function saveComparisonAction(input: {
  title?: string;
  providers: Array<{ slug: string; name: string }>;
  sendEmail?: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const providers = input.providers
      .filter((p) => p.slug?.trim())
      .slice(0, MAX_COMPARE_PROVIDERS);
    if (providers.length < 2) {
      return { ok: false, error: 'Select at least 2 agencies to compare.' };
    }

    const supabase = await insuranceDb();
    await ensureUserProfile(await createClient(), user);

    const title =
      input.title?.trim() ||
      `Compare ${providers.map((p) => p.name).join(' · ')}`.slice(0, 120);

    const snapshot = {
      providers: providers.map((p) => ({ slug: p.slug, name: p.name })),
      savedAt: new Date().toISOString(),
    };

    const { data: row, error } = await supabase
      .from('provider_comparisons')
      .insert({
        user_id: user.id,
        title,
        snapshot_json: snapshot,
      })
      .select('id')
      .single();

    if (error || !row?.id) {
      console.error('[my-insurance] save comparison', error?.message);
      return { ok: false, error: 'Could not save comparison' };
    }

    const items = providers.map((p, i) => ({
      comparison_id: row.id,
      provider_slug: p.slug,
      provider_name: p.name,
      sort_order: i,
    }));
    const { error: itemsErr } = await supabase
      .from('provider_comparison_items')
      .insert(items);
    if (itemsErr) {
      console.error('[my-insurance] comparison items', itemsErr.message);
      return { ok: false, error: 'Could not save comparison items' };
    }

    revalidatePath(MY_INSURANCE_PATH);
    revalidatePath(COMPARE_PATH);

    if (input.sendEmail !== false && user.email) {
      void sendComparisonSummaryEmail({
        to: user.email,
        title,
        providers,
        comparisonId: row.id,
      }).catch((err) => console.error('[my-insurance] comparison email', err));
    }

    return { ok: true, id: row.id as string };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function deleteComparisonAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await insuranceDb();
    const { error } = await supabase
      .from('provider_comparisons')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { ok: false, error: 'Could not delete comparison' };
    revalidatePath(MY_INSURANCE_PATH);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function submitProviderReviewAction(input: {
  providerSlug: string;
  rating: number;
  title?: string;
  body: string;
  coverageType?: string;
}): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    if (input.rating < 1 || input.rating > 5) {
      return { ok: false, error: 'Choose a rating from 1 to 5 stars.' };
    }
    const body = input.body.trim();
    if (body.length < 20) {
      return { ok: false, error: 'Please write at least 20 characters.' };
    }

    const provider = await getProviderBySlug(input.providerSlug);
    if (!provider) return { ok: false, error: 'Provider not found.' };

    const supabase = await insuranceDb();
    await ensureUserProfile(await createClient(), user);

    const authorName =
      (user.user_metadata?.full_name as string | undefined)?.trim() ||
      user.email?.split('@')[0] ||
      'My Insurance user';

    const status = 'pending';
    const { error } = await supabase.from('reviews').insert({
      provider_id: provider.id,
      user_id: user.id,
      author_name: authorName,
      rating: input.rating,
      title: input.title?.trim() || null,
      content: body,
      coverage_type: input.coverageType?.trim() || null,
      status,
    });

    if (error) {
      console.error('[my-insurance] review', error.message);
      return { ok: false, error: 'Could not submit review. Please try again.' };
    }

    revalidatePath(MY_INSURANCE_PATH);
    revalidatePath(`/providers/${input.providerSlug}`);

    if (user.email) {
      void sendReviewSubmittedEmail({
        to: user.email,
        providerName: provider.name,
        providerSlug: provider.slug,
        rating: input.rating,
        status,
      }).catch((err) => console.error('[my-insurance] review email', err));
    }

    return { ok: true, status };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function deleteMyReviewAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await insuranceDb();
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { ok: false, error: 'Could not delete review' };
    revalidatePath(MY_INSURANCE_PATH);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath(MY_INSURANCE_PATH);
}

export async function sendWelcomeIfNeededAction(): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user?.email) return;
  void sendWelcomeEmail({ to: user.email }).catch(() => undefined);
}

export async function listSavedProviderSlugsAction(): Promise<string[]> {
  const user = await getAuthenticatedUser();
  if (!user) return [];
  const supabase = await insuranceDb();
  const { data } = await supabase
    .from('saved_providers')
    .select('provider_slug')
    .eq('user_id', user.id);
  return (data ?? []).map((r: { provider_slug: string }) => r.provider_slug);
}
