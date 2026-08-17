import 'server-only';

import { assertAdminSession } from '@/lib/admin/auth';
import { getSupabaseServiceRoleKey } from '@/lib/supabase/config';
import type { AgencyListingRequest, AgencyListingRequestStatus } from '@/types/supabase';

const OPEN_STATUSES: AgencyListingRequestStatus[] = [
  'received',
  'needs_info',
  'verifying',
];

export type ListingRequestDiagnostic = {
  supabaseUrlHost: string | null;
  nextPublicHost: string | null;
  hostUsed: string | null;
  requestPath: string;
  httpStatus: number | null;
  contentRange: string | null;
  errorBody: string | null;
  jwtRole: string | null;
  jwtRef: string | null;
  serviceRoleConfigured: boolean;
  parseOk: boolean;
  rowCount: number;
};

export type ListingRequestLoadResult = {
  rows: AgencyListingRequest[];
  error: string | null;
  /** Open (non-terminal) request counts keyed by lowercase work_email */
  openByEmail: Record<string, number>;
  diagnostic: ListingRequestDiagnostic;
};

function hostOf(raw: string | undefined): string | null {
  const v = (raw || '').trim();
  if (!v) return null;
  try {
    return new URL(v).host;
  } catch {
    return v.replace(/^https?:\/\//, '').split('/')[0] || null;
  }
}

function jwtClaims(token: string): { role: string | null; ref: string | null } {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return { role: null, ref: null };
    const padded = parts[1] + '='.repeat((4 - (parts[1].length % 4)) % 4);
    const json = Buffer.from(padded, 'base64url').toString('utf8');
    const claims = JSON.parse(json) as { role?: string; ref?: string };
    return { role: claims.role ?? null, ref: claims.ref ?? null };
  } catch {
    return { role: null, ref: null };
  }
}

function emptyDiagnostic(partial?: Partial<ListingRequestDiagnostic>): ListingRequestDiagnostic {
  return {
    supabaseUrlHost: hostOf(process.env.SUPABASE_URL),
    nextPublicHost: hostOf(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hostUsed: null,
    requestPath: 'agency_listing_requests?select=*',
    httpStatus: null,
    contentRange: null,
    errorBody: null,
    jwtRole: null,
    jwtRef: null,
    serviceRoleConfigured: Boolean(getSupabaseServiceRoleKey()),
    parseOk: false,
    rowCount: 0,
    ...partial,
  };
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
 * Admin reads use SUPABASE_URL first (server project), not NEXT_PUBLIC_*.
 * Service role bypasses RLS. Never call from a public route.
 */
function adminApiBase(): string | undefined {
  return process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
}

async function serviceRoleSelect(
  path: string
): Promise<{ rows: AgencyListingRequest[]; error: string | null; diagnostic: ListingRequestDiagnostic }> {
  const base = adminApiBase()?.replace(/\/$/, '');
  const key = getSupabaseServiceRoleKey();
  const claims = key ? jwtClaims(key) : { role: null, ref: null };
  const hostUsed = hostOf(base);

  const diagnostic = emptyDiagnostic({
    hostUsed,
    requestPath: path,
    jwtRole: claims.role,
    jwtRef: claims.ref,
    serviceRoleConfigured: Boolean(key),
  });

  if (!base || !key) {
    return {
      rows: [],
      error: 'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL is not configured on the server.',
      diagnostic: {
        ...diagnostic,
        errorBody: 'missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY',
      },
    };
  }

  const url = `${base}/rest/v1/${path}`;
  try {
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
    diagnostic.httpStatus = res.status;
    diagnostic.contentRange = res.headers.get('content-range');
    if (!res.ok) {
      diagnostic.errorBody = text.slice(0, 800);
      return {
        rows: [],
        error: `Service-role read failed (${res.status}).`,
        diagnostic,
      };
    }

    try {
      const parsed = JSON.parse(text) as AgencyListingRequest[];
      const rows = Array.isArray(parsed) ? parsed : [];
      diagnostic.parseOk = Array.isArray(parsed);
      diagnostic.rowCount = rows.length;
      if (!Array.isArray(parsed)) {
        diagnostic.errorBody = text.slice(0, 800);
        return { rows: [], error: 'Service-role read returned a non-array JSON body.', diagnostic };
      }
      return { rows, error: null, diagnostic };
    } catch {
      diagnostic.errorBody = text.slice(0, 800);
      return { rows: [], error: 'Service-role read returned non-JSON.', diagnostic };
    }
  } catch (err) {
    diagnostic.errorBody = err instanceof Error ? err.message : 'fetch threw';
    return { rows: [], error: 'Service-role fetch threw before an HTTP status.', diagnostic };
  }
}

export async function loadListingRequestsForAdmin(): Promise<ListingRequestLoadResult> {
  await assertAdminSession();
  const { rows, error, diagnostic } = await serviceRoleSelect(
    'agency_listing_requests?select=*&order=created_at.desc'
  );
  return { rows, error, openByEmail: openCounts(rows), diagnostic };
}

export async function loadListingRequestByIdForAdmin(
  id: string
): Promise<{ row: AgencyListingRequest | null; error: string | null; diagnostic: ListingRequestDiagnostic }> {
  await assertAdminSession();
  const { rows, error, diagnostic } = await serviceRoleSelect(
    `agency_listing_requests?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
  );
  return { row: rows[0] ?? null, error, diagnostic };
}
