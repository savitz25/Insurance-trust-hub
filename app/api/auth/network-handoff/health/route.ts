import { NextResponse } from 'next/server';
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Probe: validates service role + handoff table/RPC (same project as Move). */
export async function GET() {
  const key = getSupabaseServiceRoleKey();
  const url = getSupabaseUrl();
  let tableOk: boolean | null = null;
  let tableError: string | null = null;
  let rpcOk: boolean | null = null;
  let rpcError: string | null = null;
  let serviceRoleValid: boolean | null = null;

  if (isSupabaseAdminConfigured()) {
    try {
      const admin = createAdminClient() as unknown as {
        from: (t: string) => {
          select: (
            c: string,
            o: { count: 'exact'; head: boolean }
          ) => Promise<{ error: { message: string } | null }>;
        };
        rpc: (
          fn: string,
          args: Record<string, string>
        ) => Promise<{ error: { message: string } | null }>;
      };

      const { error: tableErr } = await admin
        .from('network_auth_handoffs')
        .select('id', { count: 'exact', head: true });

      if (tableErr) {
        tableOk = false;
        tableError = tableErr.message || 'unknown table error';
        if (/invalid api key|jwt|not authorized/i.test(tableErr.message)) {
          serviceRoleValid = false;
        }
      } else {
        tableOk = true;
        serviceRoleValid = true;
      }

      const { error: rpcErr } = await admin.rpc('consume_network_auth_handoff', {
        p_code_hash: '0'.repeat(64),
        p_to_hub: 'insurance',
      });
      if (rpcErr) {
        rpcOk = false;
        rpcError = rpcErr.message || 'unknown rpc error';
        if (/invalid api key|jwt|not authorized/i.test(rpcErr.message)) {
          serviceRoleValid = false;
        }
      } else {
        rpcOk = true;
        if (serviceRoleValid === null) serviceRoleValid = true;
      }
    } catch (e) {
      tableOk = false;
      tableError = e instanceof Error ? e.message : String(e);
      serviceRoleValid = false;
    }
  }

  const ok =
    isSupabaseConfigured() &&
    isSupabaseAdminConfigured() &&
    serviceRoleValid === true &&
    tableOk === true &&
    rpcOk === true;

  return NextResponse.json({
    ok,
    hub: 'insurance',
    supabaseConfigured: isSupabaseConfigured(),
    serviceRoleConfigured: isSupabaseAdminConfigured(),
    serviceRole: isSupabaseAdminConfigured(),
    serviceRoleValid,
    serviceRoleKeyLength: key?.length ?? 0,
    supabaseHost: url ? (() => { try { return new URL(url).host; } catch { return null; } })() : null,
    table: tableOk,
    tableError,
    rpc: rpcOk,
    rpcError,
    routes: {
      start: '/api/auth/network-handoff/start',
      complete: '/auth/network-handoff',
    },
    hint:
      serviceRoleValid === false
        ? 'SUPABASE_SERVICE_ROLE_KEY rejected — use service_role secret from arepfylnilkjmyduhwbz (same project as Move).'
        : tableOk === false
          ? 'network_auth_handoffs missing — run migration on shared Supabase project'
          : rpcOk === false
            ? 'consume_network_auth_handoff RPC missing'
            : null,
  });
}
