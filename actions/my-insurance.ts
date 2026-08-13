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
  LicenseFreshnessItem,
  MyInsuranceDashboardData,
  MyInsuranceReviewRow,
  ResearchSessionInput,
  ResearchSessionRow,
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
  sendResearchSessionEmail,
  sendSavedCalculatorEmail,
  sendSavedProviderEmail,
  sendWelcomeEmail,
} from '@/lib/my-insurance/emails';
import { resolveLicenseFreshness } from '@/lib/providers/license-freshness';
import { getRegulatorProfile } from '@/lib/regulators/labels';
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
): Promise<{ id: string } | { error: string }> {
  const { data: existing, error: selectErr } = await supabase
    .from('drug_baskets')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selectErr) {
    console.error('[my-insurance] select basket', selectErr.message);
    // Relation missing / RLS — surface a clear ops message
    if (/relation|does not exist|permission denied|schema cache/i.test(selectErr.message)) {
      return {
        error:
          'Drug basket storage is not available yet (database). Please try again later or contact support.',
      };
    }
    return { error: 'Could not load your basket' };
  }

  if (existing?.id) return { id: existing.id as string };

  const { data: created, error } = await supabase
    .from('drug_baskets')
    .insert({ user_id: userId, name })
    .select('id')
    .single();

  if (error || !created?.id) {
    console.error('[my-insurance] create basket', error?.message);
    if (error && /relation|does not exist|permission denied|schema cache/i.test(error.message)) {
      return {
        error:
          'Drug basket storage is not available yet (database). Please try again later or contact support.',
      };
    }
    return { error: error?.message || 'Could not create basket' };
  }
  return { id: created.id as string };
}

function normalizeDrugItemRow(
  item: DrugBasketItemInput,
  basketId: string,
  index: number
) {
  const name = String(item.name ?? '').trim();
  const strength = String(item.strength ?? '').trim();
  const dosage = String(item.dosage ?? '').trim();
  const form = String(item.form || 'Tablet').trim() || 'Tablet';
  const quantityRaw = item.quantity;
  const quantity =
    quantityRaw == null || quantityRaw === ''
      ? null
      : String(quantityRaw).trim() || null;
  const notesRaw = item.notes;
  const notes =
    notesRaw == null || notesRaw === '' ? null : String(notesRaw).trim() || null;

  return {
    basket_id: basketId,
    name,
    strength,
    form,
    dosage,
    quantity,
    notes,
    sort_order: typeof item.sort_order === 'number' ? item.sort_order : index,
  };
}

/** Replace primary basket items with the given list (one active basket — idempotent upsert). */
export async function saveDrugBasketAction(input: {
  items: DrugBasketItemInput[];
  basketName?: string;
  sendEmail?: boolean;
}): Promise<{ ok: true; basketId: string } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    if (!Array.isArray(input.items) || !input.items.length) {
      return { ok: false, error: 'Add at least one medication before saving.' };
    }

    const cleaned = input.items
      .map((item, index) => normalizeDrugItemRow(item, '', index))
      .filter((r) => r.name && r.strength && r.dosage);

    if (!cleaned.length) {
      return {
        ok: false,
        error: 'Each medication needs a name, strength, and dosage.',
      };
    }

    const supabase = await insuranceDb();
    await ensureUserProfile(await createClient(), user);

    const basketName = input.basketName?.trim() || 'My prescriptions';
    const basketResult = await getOrCreatePrimaryBasket(supabase, user.id, basketName);
    if ('error' in basketResult) {
      return { ok: false, error: basketResult.error };
    }
    const basket = basketResult;

    const { error: updateErr } = await supabase
      .from('drug_baskets')
      .update({ name: basketName, updated_at: new Date().toISOString() })
      .eq('id', basket.id)
      .eq('user_id', user.id);

    if (updateErr) {
      console.error('[my-insurance] update basket', updateErr.message);
      return { ok: false, error: 'Could not update basket' };
    }

    const { error: delErr } = await supabase
      .from('drug_basket_items')
      .delete()
      .eq('basket_id', basket.id);

    if (delErr) {
      console.error('[my-insurance] clear basket items', delErr.message);
      return {
        ok: false,
        error: 'Could not update medications (clear failed). Try again.',
      };
    }

    const rows = cleaned.map((r, index) => ({
      ...r,
      basket_id: basket.id,
      sort_order: index,
    }));

    const { error: insertErr } = await supabase.from('drug_basket_items').insert(rows);
    if (insertErr) {
      console.error('[my-insurance] basket items', insertErr.message);
      return {
        ok: false,
        error: insertErr.message?.includes('row-level security')
          ? 'Could not save medications (permission denied). Sign out and back in, then try again.'
          : 'Could not save medications. Please try again.',
      };
    }

    revalidatePath(MY_INSURANCE_PATH);
    revalidatePath(DRUG_BASKET_PATH);

    if (input.sendEmail !== false && user.email) {
      void sendDrugBasketEmail({
        to: user.email,
        basketName,
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
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') {
      return { ok: false, error: 'Sign in required' };
    }
    console.error('[my-insurance] saveDrugBasketAction', e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not save medications',
    };
  }
}

/** Load the signed-in user's primary drug basket (for HQ + tool preload). */
export async function getDrugBasketAction(): Promise<
  | { ok: true; basket: DrugBasketWithItems | null }
  | { ok: false; error: string }
> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { ok: false, error: 'Sign in required' };

    const supabase = await insuranceDb();
    const { data: basketRow, error: basketErr } = await supabase
      .from('drug_baskets')
      .select('id,user_id,name,created_at,updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (basketErr) {
      console.error('[my-insurance] getDrugBasket basket', basketErr.message);
      return { ok: false, error: 'Could not load basket' };
    }

    if (!basketRow?.id) {
      return { ok: true, basket: null };
    }

    const { data: items, error: itemsErr } = await supabase
      .from('drug_basket_items')
      .select(
        'id,basket_id,name,strength,form,dosage,quantity,notes,sort_order,created_at'
      )
      .eq('basket_id', basketRow.id)
      .order('sort_order', { ascending: true });

    if (itemsErr) {
      console.error('[my-insurance] getDrugBasket items', itemsErr.message);
      return { ok: false, error: 'Could not load medications' };
    }

    return {
      ok: true,
      basket: {
        ...(basketRow as Omit<DrugBasketWithItems, 'items'>),
        items: (items ?? []) as DrugBasketItemRow[],
      },
    };
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') {
      return { ok: false, error: 'Sign in required' };
    }
    console.error('[my-insurance] getDrugBasketAction', e);
    return { ok: false, error: 'Could not load basket' };
  }
}

export async function deleteDrugBasketAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await insuranceDb();
    const { error } = await supabase.from('drug_baskets').delete().eq('user_id', user.id);
    if (error) {
      console.error('[my-insurance] delete basket', error.message);
      return { ok: false, error: 'Could not delete basket' };
    }
    revalidatePath(MY_INSURANCE_PATH);
    revalidatePath(DRUG_BASKET_PATH);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') {
      return { ok: false, error: 'Sign in required' };
    }
    return { ok: false, error: 'Could not delete basket' };
  }
}

export async function removeDrugBasketItemAction(
  itemId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await insuranceDb();
    const basketResult = await getOrCreatePrimaryBasket(supabase, user.id);
    if ('error' in basketResult) return { ok: false, error: basketResult.error };
    const basket = basketResult;

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
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') {
      return { ok: false, error: 'Sign in required' };
    }
    return { ok: false, error: 'Could not remove medication' };
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
          : input.calculatorId === 'aca_plan_explorer'
            ? '/tools/aca-plan-explorer'
            : input.calculatorId === 'cost_estimator'
              ? '/tools/cost-estimator'
              : input.calculatorId === 'marketplace_research'
                ? '/tools/marketplace-plan-research'
                : input.calculatorId === 'needs_assessment'
                  ? '/tools/coverage-compass'
                  : '/tools'),
    };

    // Denormalized list fields from marketplace research (or inputs)
    const research = snapshot.marketplaceResearch;
    const inputs = (snapshot.inputs || {}) as Record<string, unknown>;
    const zip =
      research?.zip ||
      (typeof inputs.zip === 'string' ? inputs.zip : null) ||
      null;
    const state =
      research?.state ||
      (typeof inputs.state === 'string' ? inputs.state : null) ||
      null;
    const county =
      research?.county ||
      (typeof inputs.county === 'string' ? inputs.county : null) ||
      null;
    const usedLive =
      research?.usedLiveMarketplace ??
      (typeof (snapshot.outputs as { usedLiveMarketplace?: boolean } | undefined)
        ?.usedLiveMarketplace === 'boolean'
        ? (snapshot.outputs as { usedLiveMarketplace: boolean }).usedLiveMarketplace
        : null);
    const planYear =
      research?.planYear ??
      (typeof (snapshot.outputs as { planYear?: number } | undefined)?.planYear ===
      'number'
        ? (snapshot.outputs as { planYear: number }).planYear
        : null);

    const insertRow: Record<string, unknown> = {
      user_id: user.id,
      calculator_id: input.calculatorId,
      title,
      snapshot: snapshot as unknown as Record<string, unknown>,
      zip,
      state,
      county,
      used_live_marketplace: usedLive,
      plan_year: planYear,
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await supabase
      .from('saved_calculator_results')
      .insert(insertRow)
      .select('id')
      .single();

    // If migration not applied yet, retry without new columns
    if (error && /column|schema cache|used_live|plan_year/i.test(error.message || '')) {
      const fallback = await supabase
        .from('saved_calculator_results')
        .insert({
          user_id: user.id,
          calculator_id: input.calculatorId,
          title,
          snapshot: snapshot as unknown as Record<string, unknown>,
        })
        .select('id')
        .single();
      data = fallback.data;
      error = fallback.error;
    }

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
        marketLabel: research?.marketLabel || undefined,
        usedLiveMarketplace: research?.usedLiveMarketplace,
        planCount: research?.marketSnapshot?.planCount ?? undefined,
        issuerCount: research?.marketSnapshot?.issuerCount ?? undefined,
        planYear: research?.planYear ?? undefined,
      }).catch((err) => console.error('[my-insurance] calc email', err));
    }

    return { ok: true, id: data.id as string };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export type GuestCalculatorSnapshotInput = {
  toolId: string;
  title: string;
  summary: string;
  href: string;
  payload?: Record<string, unknown>;
};

/** Import guest device research into cloud. Skips titles already saved. No email. */
export async function mergeGuestCalculatorSnapshotsAction(
  snaps: GuestCalculatorSnapshotInput[]
): Promise<{ ok: true; merged: number } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    if (!snaps.length) return { ok: true, merged: 0 };
    const { mapToolIdToCalculatorId } = await import('@/lib/my-insurance/types');
    let merged = 0;
    const dash = await getMyInsuranceDashboardData();
    const existing = new Set(
      (dash?.calculatorResults ?? []).map(
        (r) => `${r.calculator_id}::${(r.title || '').trim().toLowerCase()}`
      )
    );
    for (const snap of snaps) {
      const calculatorId = mapToolIdToCalculatorId(snap.toolId);
      const key = `${calculatorId}::${(snap.title || '').trim().toLowerCase()}`;
      if (existing.has(key)) continue;
      const res = await saveCalculatorResultAction({
        calculatorId,
        title: snap.title,
        snapshot: {
          summaryText: snap.summary,
          sourcePath: snap.href,
          inputs: snap.payload ?? {},
        },
        sendEmail: false,
      });
      if (res.ok) {
        existing.add(key);
        merged += 1;
      }
    }
    return { ok: true, merged };
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

export async function saveResearchSessionAction(
  input: ResearchSessionInput,
  opts?: { sendEmail?: boolean }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await insuranceDb();
    await ensureUserProfile(await createClient(), user);
    const title = input.title.trim().slice(0, 160) || 'Saved research session';
    const resumeHref = input.resumeHref.trim() || '/my-insurance';
    const { data, error } = await supabase
      .from('research_sessions')
      .insert({
        user_id: user.id,
        title,
        source: input.source,
        provider_slug: input.providerSlug || null,
        provider_name: input.providerName || null,
        hub_path: input.hubPath || null,
        directory_href: input.directoryHref || null,
        marketplace_zip: input.marketplaceZip || null,
        planner_href: input.plannerHref || null,
        resume_href: resumeHref,
        note: input.note?.trim().slice(0, 280) || null,
      })
      .select('id')
      .single();
    if (error || !data) {
      console.error('[my-insurance] save session', error?.message);
      return { ok: false, error: 'Could not save research session' };
    }
    revalidatePath(MY_INSURANCE_PATH);
    if (opts?.sendEmail !== false && user.email) {
      void sendResearchSessionEmail({
        to: user.email,
        title,
        resumeHref,
        providerName: input.providerName,
      }).catch((err) => console.error('[my-insurance] session email', err));
    }
    return { ok: true, id: data.id as string };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function deleteResearchSessionAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await insuranceDb();
    const { error } = await supabase
      .from('research_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { ok: false, error: 'Could not delete session' };
    revalidatePath(MY_INSURANCE_PATH);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function mergeGuestResearchSessionsAction(
  guests: ResearchSessionInput[]
): Promise<{ ok: true; merged: number } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    if (!guests.length) return { ok: true, merged: 0 };
    let merged = 0;
    for (const g of guests.slice(0, 20)) {
      const res = await saveResearchSessionAction(g, { sendEmail: false });
      if (res.ok) merged += 1;
    }
    return { ok: true, merged };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function getMyInsuranceDashboardData(): Promise<MyInsuranceDashboardData | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const supabase = await insuranceDb();
  await ensureUserProfile(await createClient(), user);

  let calcRes = await supabase
    .from('saved_calculator_results')
    .select(
      'id,user_id,calculator_id,title,snapshot,created_at,zip,state,county,used_live_marketplace,plan_year,updated_at'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (calcRes.error && /column|schema cache/i.test(calcRes.error.message || '')) {
    calcRes = await supabase
      .from('saved_calculator_results')
      .select('id,user_id,calculator_id,title,snapshot,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
  }

  const [providersRes, basketsRes, comparisonsRes, reviewsRes, sessionsRes] = await Promise.all([
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
    supabase
      .from('research_sessions')
      .select(
        'id,user_id,title,source,provider_slug,provider_name,hub_path,directory_href,marketplace_zip,planner_href,resume_href,note,created_at,updated_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40),
  ]);

  if (basketsRes.error) {
    console.error('[my-insurance] dashboard baskets', basketsRes.error.message);
  }

  let drugBasket: DrugBasketWithItems | null = null;
  if (basketsRes.data?.id) {
    const { data: items, error: itemsErr } = await supabase
      .from('drug_basket_items')
      .select(
        'id,basket_id,name,strength,form,dosage,quantity,notes,sort_order,created_at'
      )
      .eq('basket_id', basketsRes.data.id)
      .order('sort_order', { ascending: true });

    if (itemsErr) {
      console.error('[my-insurance] dashboard basket items', itemsErr.message);
    }

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
  if (sessionsRes.error && !/schema cache|does not exist/i.test(sessionsRes.error.message || '')) {
    console.error('[my-insurance] dashboard sessions', sessionsRes.error.message);
  }

  const savedProviders = (providersRes.data ?? []) as SavedProviderRow[];
  const freshnessItems: LicenseFreshnessItem[] = [];
  const slugs = savedProviders.map((p) => p.provider_slug).filter(Boolean);
  if (slugs.length) {
    const { data: licenseRows } = await supabase
      .from('providers')
      .select('slug,name,license_info,states_licensed')
      .in('slug', slugs.slice(0, 50));
    for (const row of licenseRows ?? []) {
      const checkedAt = row.license_info?.licenses?.[0]?.checkedAt ?? null;
      const fresh = resolveLicenseFreshness(checkedAt);
      if (fresh.kind !== 'stale') continue;
      const state = Array.isArray(row.states_licensed) ? row.states_licensed[0] : null;
      const regulator = getRegulatorProfile(state);
      freshnessItems.push({
        providerSlug: row.slug,
        providerName:
          row.name ||
          savedProviders.find((p) => p.provider_slug === row.slug)?.provider_name ||
          row.slug,
        licenseCheckedAt: checkedAt,
        days: fresh.days,
        kind: 'stale',
        regulatorLookupUrl: regulator?.lookupUrl ?? null,
      });
    }
  }

  const researchSessions: ResearchSessionRow[] = (sessionsRes.error ? [] : sessionsRes.data ?? []).map(
    (row: Record<string, unknown>) => ({
      id: String(row.id),
      user_id: String(row.user_id ?? ''),
      title: String(row.title ?? 'Saved research'),
      source: (row.source as ResearchSessionRow['source']) || 'profile',
      providerSlug: (row.provider_slug as string) || null,
      providerName: (row.provider_name as string) || null,
      hubPath: (row.hub_path as string) || null,
      directoryHref: (row.directory_href as string) || null,
      marketplaceZip: (row.marketplace_zip as string) || null,
      plannerHref: (row.planner_href as string) || null,
      resumeHref: String(row.resume_href ?? '/my-insurance'),
      note: (row.note as string) || null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at ?? row.created_at),
    })
  );

  return {
    savedProviders,
    drugBasket,
    calculatorResults: (calcRes.data ?? []).map(
      (row: SavedCalculatorResultRow & { snapshot?: unknown }) => ({
        ...row,
        snapshot: (row.snapshot ?? {}) as CalculatorSnapshot,
      })
    ) as SavedCalculatorResultRow[],
    comparisons,
    myReviews,
    researchSessions,
    freshnessItems,
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

/* ── Phase 11 research wallet (cross-device) ── */

export type ResearchWalletPayload = {
  version: 1;
  updatedAt: string;
  plans: unknown[];
  doctors: unknown[];
  drugs: unknown[];
  preferences: Record<string, unknown>;
  notes: string;
};

/**
 * Fetch cloud research wallet for signed-in user.
 * Returns null if not signed in or table missing / empty.
 */
export async function getResearchWalletCloudAction(): Promise<{
  ok: true;
  payload: ResearchWalletPayload | null;
} | { ok: false; error: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { ok: true, payload: null };

    const supabase = await insuranceDb();
    const { data, error } = await supabase
      .from('insurance_research_wallets')
      .select('payload, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      // Table may not be migrated yet — soft fail
      console.warn('[research-wallet] get', error.message);
      return { ok: true, payload: null };
    }
    if (!data?.payload) return { ok: true, payload: null };
    return { ok: true, payload: data.payload as ResearchWalletPayload };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not load wallet',
    };
  }
}

/** Upsert full research wallet payload for signed-in user. */
export async function saveResearchWalletCloudAction(
  payload: ResearchWalletPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await insuranceDb();
    await ensureUserProfile(await createClient(), user);

    const body = {
      user_id: user.id,
      payload: {
        ...payload,
        version: 1 as const,
        updatedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('insurance_research_wallets')
      .upsert(body, { onConflict: 'user_id' });

    if (error) {
      console.error('[research-wallet] save', error.message);
      return {
        ok: false,
        error:
          error.message?.includes('does not exist') ||
          error.message?.includes('schema cache')
            ? 'Cloud wallet table not available yet — saved on this device only.'
            : 'Could not sync wallet to cloud',
      };
    }

    revalidatePath(MY_INSURANCE_PATH);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') {
      return { ok: false, error: 'Sign in with magic link to sync across devices' };
    }
    return { ok: false, error: 'Could not sync wallet' };
  }
}

/** Delete cloud research wallet for signed-in user. */
export async function deleteResearchWalletCloudAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await insuranceDb();
    const { error } = await supabase
      .from('insurance_research_wallets')
      .delete()
      .eq('user_id', user.id);
    if (error) {
      console.error('[research-wallet] delete', error.message);
      return { ok: false, error: 'Could not delete cloud wallet' };
    }
    revalidatePath(MY_INSURANCE_PATH);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') {
      return { ok: false, error: 'Sign in required' };
    }
    return { ok: false, error: 'Could not delete cloud wallet' };
  }
}
