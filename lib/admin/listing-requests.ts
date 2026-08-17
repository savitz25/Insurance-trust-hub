import 'server-only';

import { assertAdminSession } from '@/lib/admin/auth';
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
} from '@/lib/supabase/config';
import type { AgencyListingRequest, AgencyListingRequestStatus } from '@/types/supabase';

const OPEN_STATUSES: AgencyListingRequestStatus[] = [
  'received',
  'needs_info',
  'verifying',
];

export type ListingRequestLoadResult = {
  rows: AgencyListingRequest[];
  error: string | null;
  /** Open (non-terminal) request counts keyed by lowercase work_email */
  openByEmail: Record<string, number>;
};

function emptyResult(error: string | null): ListingRequestLoadResult {
  return { rows: [], error, openByEmail: {} };
}

function openCounts(rows: AgencyListingRequest[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (!OPEN_STATUSES.includes(row.status)) continue;
    const key = (row.work_email || '').trim().toLowerCase();
    if (!key) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/**
 * Privileged PostgREST read. Uses the service role key so RLS never hides
 * PII from ops. Never call from a public route.
 */
async function serviceRoleSelect(
  path: string
): Promise<{ rows: AgencyListingRequest[]; error: string | null }> {
  const base = getSupabaseUrl()?.replace(/\/$/, '');
  const key = getSupabaseServiceRoleKey();
  if (!base || !key) {
    return { rows: [], error: 'SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_URL) is not configured on the server.' };
  }

  const url = `${base}/rest/v1/${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      Prefer: 'count=exact',
    },
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) {
    return {
      rows: [],
      error: `Service-role read failed (${res.status}): ${text.slice(0, 400)}`,
    };
  }

  try {
    const parsed = JSON.parse(text) as AgencyListingRequest[];
    return { rows: Array.isArray(parsed) ? parsed : [], error: null };
  } catch {
    return { rows: [], error: 'Service-role read returned non-JSON.' };
  }
}

export async function loadListingRequestsForAdmin(): Promise<ListingRequestLoadResult> {
  await assertAdminSession();
  if (!isSupabaseAdminConfigured()) {
    return emptyResult('Admin data load requires SUPABASE_SERVICE_ROLE_KEY on the server.');
  }

  const { rows, error } = await serviceRoleSelect(
    'agency_listing_requests?select=*&order=created_at.desc'
  );
  if (error) return emptyResult(error);
  return { rows, error: null, openByEmail: openCounts(rows) };
}

export async function loadListingRequestByIdForAdmin(
  id: string
): Promise<{ row: AgencyListingRequest | null; error: string | null }> {
  await assertAdminSession();
  if (!isSupabaseAdminConfigured()) {
    return { row: null, error: 'Admin data load requires SUPABASE_SERVICE_ROLE_KEY on the server.' };
  }

  const { rows, error } = await serviceRoleSelect(
    `agency_listing_requests?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
  );
  if (error) return { row: null, error };
  return { row: rows[0] ?? null, error: null };
}
