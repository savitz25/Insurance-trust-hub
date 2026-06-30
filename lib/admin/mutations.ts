import 'server-only';

import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertAdminSession } from '@/lib/admin/auth';
import {
  formToDbInsert,
  type AdminProviderFormData,
} from '@/lib/admin/provider-mapper';
import type { ReviewStatus } from '@/types/supabase';

export async function createProvider(data: AdminProviderFormData) {
  await assertAdminSession();

  if (!isSupabaseAdminConfigured()) {
    console.info('[admin] createProvider (no Supabase)', data.slug);
    return { id: `fallback-${Date.now()}`, slug: data.slug };
  }

  const supabase = createAdminClient();
  const insert = formToDbInsert(data);
  const { data: row, error } = await supabase.from('providers').insert(insert).select('id, slug').single();

  if (error) throw new Error(error.message);
  return row;
}

export async function updateProvider(id: string, data: AdminProviderFormData) {
  await assertAdminSession();

  if (!isSupabaseAdminConfigured()) {
    console.info('[admin] updateProvider (no Supabase)', id);
    return { id, slug: data.slug };
  }

  const supabase = createAdminClient();
  const insert = formToDbInsert(data);
  const { data: row, error } = await supabase
    .from('providers')
    .update(insert)
    .eq('id', id)
    .select('id, slug')
    .single();

  if (error) throw new Error(error.message);
  return row;
}

export async function deleteProvider(id: string) {
  await assertAdminSession();

  if (!isSupabaseAdminConfigured()) {
    console.info('[admin] deleteProvider (no Supabase)', id);
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('providers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function moderateReview(id: string, status: ReviewStatus) {
  await assertAdminSession();

  if (!isSupabaseAdminConfigured()) {
    console.info('[admin] moderateReview (no Supabase)', id, status);
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('reviews').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}