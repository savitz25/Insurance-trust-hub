# Silent cross-domain SSO (network handoff)

One Ask Trust Hub account (shared Supabase project **arepfylnilkjmyduhwbz**).  
Cookies stay **per domain**; this handoff establishes a session on the destination hub without a second login form.

## Flow

1. User signed in on Hub A  
2. Network bar (or link) → `GET /api/auth/network-handoff/start?to=lender&next=/my-lending` **on A**  
3. A verifies session, inserts one-time row (hashed code, 90s TTL), 302 →  
   `https://www.{target}/auth/network-handoff?code=…&next=…`  
4. Target consumes code (atomic), mints session via admin `generateLink` + `verifyOtp`, sets cookies on **B**, redirects to HQ  

## Security

| Rule | Implementation |
|------|----------------|
| Single-use | `consume_network_auth_handoff` sets `used_at` atomically |
| TTL | 90 seconds (`HANDOFF_TTL_SECONDS`) |
| Target-bound | `to_hub` must match consuming hub |
| Session required | Start route checks `getUser()` |
| No long-lived tokens in URL | Only one-time opaque `code` (hash stored) |
| Rate limit | ≤10 creates / user / minute |
| Soft fail | Redirect to logged-out HQ with `?handoff=failed` |

## Ops (required)

1. **Run migration** on shared Supabase project (once):  
   `supabase/migrations/20260805120000_network_auth_handoffs.sql`  
2. Each Vercel project needs **`SUPABASE_SERVICE_ROLE_KEY`** (server-only) for handoff create/consume  
3. Same `NEXT_PUBLIC_SUPABASE_URL` + anon key as shared project  

### Production probe (must pass after deploy)

```http
GET /api/auth/network-handoff/health  → 200 JSON { ok: true, hub, serviceRole }
GET /auth/network-handoff             → 307 to HQ ?handoff=failed (not 404)
GET /api/auth/network-handoff/start?to=lender → 307 (not 404)
```

**Why production 404’d (2026-08-05):** routes were on GitHub `main` (Insurance `fa9357e+`, Move `1559bb89+`) but **Vercel Production was still serving an older deployment** without those route modules. Lender auto-deployed (health 200); Move/Insurance did not. Fix: Vercel → Project → Deployments → **Redeploy** Production from latest `main` (or fix Production Branch / failed build).

Env name for admin: **`SUPABASE_SERVICE_ROLE_KEY`** (same on all hubs; health JSON `serviceRole: true` confirms).

## Routes

| Route | Role |
|-------|------|
| `GET /api/auth/network-handoff/start?to=…` | Hub A — create + redirect |
| `GET /auth/network-handoff?code=…` | Hub B — complete + set cookies |

## Guest behavior

Logged-out network links stay plain public URLs (no handoff).
