import 'server-only';

import { createHash, randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';

export type NetworkHubId = 'move' | 'insurance' | 'lender' | 'ask';

export const HANDOFF_TTL_SECONDS = 90;
export const HANDOFF_RATE_LIMIT_PER_MINUTE = 10;

export const HUB_ORIGINS: Record<NetworkHubId, string> = {
  move: 'https://www.movetrusthub.com',
  insurance: 'https://www.insurancetrusthub.com',
  lender: 'https://www.lendertrusthub.com',
  ask: 'https://www.asktrusthub.com',
};

export const HUB_DEFAULT_PATH: Record<NetworkHubId, string> = {
  move: '/my-move',
  insurance: '/my-insurance',
  lender: '/my-lending',
  ask: '/',
};

/** This deploy is Insurance Trust Hub. */
export const CURRENT_HUB: NetworkHubId = 'insurance';

export function isNetworkHubId(v: string | null | undefined): v is NetworkHubId {
  return v === 'move' || v === 'insurance' || v === 'lender' || v === 'ask';
}

export function hashHandoffCode(code: string): string {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

export function generateHandoffCode(): string {
  return randomBytes(32).toString('base64url');
}

/** Safe relative path only (open-redirect safe). */
export function sanitizeHandoffPath(
  path: string | null | undefined,
  toHub: NetworkHubId
): string {
  const fallback = HUB_DEFAULT_PATH[toHub];
  if (!path || !path.startsWith('/') || path.startsWith('//')) return fallback;
  if (path.startsWith('/auth/')) return fallback;
  if (path.length > 512) return fallback;
  try {
    const u = new URL(path, HUB_ORIGINS[toHub]);
    if (u.origin !== new URL(HUB_ORIGINS[toHub]).origin) return fallback;
    return `${u.pathname}${u.search}${u.hash}` || fallback;
  } catch {
    return fallback;
  }
}

export function handoffCompleteUrl(toHub: NetworkHubId, code: string, next: string): string {
  const u = new URL('/auth/network-handoff', HUB_ORIGINS[toHub]);
  u.searchParams.set('code', code);
  u.searchParams.set('next', next);
  return u.toString();
}

type Admin = ReturnType<typeof createAdminClient>;

function adminUntyped(): Admin {
  return createAdminClient();
}

export async function countRecentHandoffs(userId: string): Promise<number> {
  if (!isSupabaseAdminConfigured()) return 0;
  const admin = adminUntyped() as unknown as {
    from: (t: string) => {
      select: (
        c: string,
        o: { count: 'exact'; head: boolean }
      ) => {
        eq: (
          a: string,
          b: string
        ) => {
          gte: (
            a: string,
            b: string
          ) => Promise<{ count: number | null; error: { message: string } | null }>;
        };
      };
    };
  };
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await admin
    .from('network_auth_handoffs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if (error) {
    console.error('[network-handoff] rate count', error.message);
    return 0;
  }
  return count ?? 0;
}

export type CreateHandoffResult =
  | { ok: true; code: string; redirectUrl: string }
  | { ok: false; status: number; error: string };

export async function createNetworkHandoff(params: {
  userId: string;
  fromHub: NetworkHubId;
  toHub: NetworkHubId;
  destinationPath?: string | null;
  ip?: string | null;
}): Promise<CreateHandoffResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      status: 503,
      error: 'Cross-hub sign-in is not configured (service role missing).',
    };
  }
  if (params.fromHub === params.toHub) {
    return { ok: false, status: 400, error: 'Already on target hub.' };
  }

  const recent = await countRecentHandoffs(params.userId);
  if (recent >= HANDOFF_RATE_LIMIT_PER_MINUTE) {
    return {
      ok: false,
      status: 429,
      error: 'Too many cross-hub sign-ins. Wait a minute and try again.',
    };
  }

  const code = generateHandoffCode();
  const codeHash = hashHandoffCode(code);
  const next = sanitizeHandoffPath(params.destinationPath, params.toHub);
  const expiresAt = new Date(Date.now() + HANDOFF_TTL_SECONDS * 1000).toISOString();

  const admin = adminUntyped() as unknown as {
    from: (t: string) => {
      insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };
  };

  const { error } = await admin.from('network_auth_handoffs').insert({
    code_hash: codeHash,
    user_id: params.userId,
    from_hub: params.fromHub,
    to_hub: params.toHub,
    destination_path: next,
    expires_at: expiresAt,
    created_ip: params.ip ?? null,
  });

  if (error) {
    console.error('[network-handoff] insert failed', error.message);
    return { ok: false, status: 500, error: 'Could not start cross-hub sign-in.' };
  }

  return {
    ok: true,
    code,
    redirectUrl: handoffCompleteUrl(params.toHub, code, next),
  };
}

export type ConsumeHandoffResult =
  | { ok: true; userId: string; destinationPath: string }
  | { ok: false; status: number; error: string };

export async function consumeNetworkHandoff(
  code: string,
  toHub: NetworkHubId
): Promise<ConsumeHandoffResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, status: 503, error: 'Cross-hub sign-in is not configured.' };
  }
  if (!code || code.length < 16 || code.length > 200) {
    return { ok: false, status: 400, error: 'Invalid handoff.' };
  }

  const codeHash = hashHandoffCode(code);
  const admin = adminUntyped() as unknown as {
    rpc: (
      fn: string,
      args: Record<string, string>
    ) => Promise<{
      data: Array<{
        out_user_id: string;
        out_from_hub: string;
        out_destination_path: string | null;
      }> | null;
      error: { message: string } | null;
    }>;
  };

  const { data, error } = await admin.rpc('consume_network_auth_handoff', {
    p_code_hash: codeHash,
    p_to_hub: toHub,
  });

  if (error) {
    console.error('[network-handoff] consume rpc', error.message);
    return { ok: false, status: 500, error: 'Could not complete cross-hub sign-in.' };
  }

  const row = data?.[0];
  if (!row?.out_user_id) {
    return { ok: false, status: 400, error: 'Handoff expired or already used.' };
  }

  return {
    ok: true,
    userId: row.out_user_id,
    destinationPath: sanitizeHandoffPath(row.out_destination_path, toHub),
  };
}

/**
 * Establish a session for userId on this hub via one-time magiclink token (server-side).
 * Returns token_hash for verifyOtp — never log the hash.
 */
export async function mintSessionTokenHashForUser(
  userId: string
): Promise<{ ok: true; tokenHash: string; type: string } | { ok: false; error: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: 'Admin not configured' };
  }
  const admin = createAdminClient();
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId);
  if (userErr || !userData.user?.email) {
    console.error('[network-handoff] getUserById', userErr?.message);
    return { ok: false, error: 'User not found' };
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email,
    options: {
      redirectTo: HUB_ORIGINS[CURRENT_HUB],
    },
  });

  if (error || !data?.properties?.hashed_token) {
    console.error('[network-handoff] generateLink', {
      message: error?.message,
      status: (error as { status?: number } | null)?.status,
      hasProps: Boolean(data?.properties),
    });
    return { ok: false, error: error?.message || 'Could not create session' };
  }

  return {
    ok: true,
    tokenHash: data.properties.hashed_token,
    type: data.properties.verification_type || 'magiclink',
  };
}
