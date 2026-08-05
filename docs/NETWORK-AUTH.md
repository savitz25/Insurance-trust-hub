# Network identity — Insurance Trust Hub

**Goal:** One **Ask Trust Hub** account across Move, Insurance, and Lending.  
**Move is source of truth** for auth UX (magic link default + optional password + Google + Facebook).

**Production host:** `https://www.insurancetrusthub.com`  
**Repo:** Insurance-Trust-Hub (production only)

---

## Shared identity (required for same `auth.users` id)

Insurance and Lending Vercel projects must use the **same Supabase Auth project** as Move:

| Env | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Shared project URL (must match Move) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Shared anon key |
| `NEXT_PUBLIC_SITE_URL` | `https://www.insurancetrusthub.com` |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional (welcome emails, admin generateLink) |
| `RESEND_API_KEY` / `RESEND_FROM` | Optional branded magic-link mail |

Do **not** hardcode secrets in git.

---

## Auth routes (this repo)

| Path | Role |
|------|------|
| `POST /api/auth/magic-link` | Email magic link |
| `GET /api/auth/google` | Start Google OAuth |
| `GET /api/auth/facebook` | Start Facebook OAuth |
| `GET /auth/callback` | OAuth / code exchange → session + profile |
| `GET /auth/confirm` | Email OTP `token_hash` verify |
| `GET /api/auth/network-handoff/start` | Start silent SSO to another hub (session required) |
| `GET /auth/network-handoff` | Complete SSO — set cookies on this domain |

Post-login default: `/my-insurance` (success/error via `?auth=` helpers in `oauth-redirect.ts`).

---

## Client surface

| Piece | Location |
|-------|----------|
| Provider + merge-safe continuity | `components/my-insurance/my-insurance-provider.tsx` |
| Auth modal (magic → Google → Facebook) | `components/my-insurance/auth-modal.tsx` |
| Social buttons | `components/my-insurance/social-sign-in-buttons.tsx` |
| Shell | `components/my-insurance/my-insurance-shell.tsx` |
| Header Sign in | `components/navbar.tsx` |
| HQ account strip | `components/my-insurance/my-insurance-dashboard.tsx` |
| Constants | `lib/my-insurance/constants.ts` |
| Continuity rules | `docs/MY-INSURANCE-AUTH-CONTINUITY.md` |
| Middleware session refresh | `middleware.ts` + `lib/supabase/middleware.ts` |

**Guest-first:** no login wall on hubs, tools, calculators.  
**Sign-out** does not clear `ith:my-insurance:v1` or compare tray.  
**Merge safety:** empty cloud never replaces multi-plan local state.

---

## Ops checklist (human — consoles)

### Supabase Auth → URL configuration (required — human)

Shared project **arepfylnilkjmyduhwbz**. If a hub’s callback is missing from **Redirect URLs**, Supabase falls back to Site URL (Move) → `movetrusthub.com/?code=…`.

Add if missing:

```
https://www.movetrusthub.com/**
https://www.insurancetrusthub.com/**
https://www.lendertrusthub.com/**
https://www.asktrusthub.com/**
http://localhost:3000/**
```

### App redirect rules (code) — Move bridge

Shared Supabase **Site URL** is Move. Missing allow-list entries cause magic link / Google to finish on Move with **no cookie** on Insurance.

**Default** (`AUTH_OAUTH_DIRECT` unset):

1. `emailRedirectTo` / OAuth `redirectTo` =  
   `https://www.movetrusthub.com/auth/callback?next=/my-insurance&hub=insurance`
2. Move hands off **without exchanging** →  
   `https://www.insurancetrusthub.com/auth/callback?code=…`
3. Insurance sets session cookies on **insurancetrusthub.com**

Resend magic links (when configured) use `/auth/confirm` **directly on Insurance** (token_hash; no bridge).

Set `AUTH_OAUTH_DIRECT=1` only after allow-list includes this hub.

### Google Cloud OAuth + Facebook Login

Authorized origins / redirect URIs for all three `www` domains.

### Vercel (Insurance)

- `NEXT_PUBLIC_SUPABASE_URL` = **same value as Move** (project arepfylnilkjmyduhwbz)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = **same as Move**
- `NEXT_PUBLIC_SITE_URL` = `https://www.insurancetrusthub.com` (must be Insurance, not Move)

---

## Silent cross-domain SSO (network handoff)

Cookies are **per domain**. After initial login stays on the originating hub, navigating to another specialist domain uses a one-time handoff:

1. Signed-in user on Hub A clicks network bar / seal / journey link  
2. `GET /api/auth/network-handoff/start?to=lender&next=/my-lending` (same origin)  
3. A verifies session → inserts `network_auth_handoffs` row (SHA-256 of code, 90s TTL)  
4. 302 → `https://www.{target}/auth/network-handoff?code={plaintext_once}`  
5. B consumes code (atomic `used_at`), mints session via **admin `generateLink` + `verifyOtp`**, sets cookies with the same `@supabase/ssr` pattern as `/auth/callback`, redirects to HQ  

| Item | Detail |
|------|--------|
| Migration | `supabase/migrations/20260805120000_network_auth_handoffs.sql` (run once on shared project) |
| Start | `app/api/auth/network-handoff/start/route.ts` |
| Complete | `app/auth/network-handoff/route.ts` |
| Lib | `lib/network/network-handoff.ts` |
| Client helper | `lib/network/handoff-href.ts` → `networkHubHref` / `rewriteCrossHubHref` |
| Wiring | Network bar, footer seal, journey `NetworkHandoff` cards via `CrossHubLink` |
| Env | **`SUPABASE_SERVICE_ROLE_KEY`** required on each Vercel project for handoff |
| Sign-out v1 | Current domain only (other hubs may stay signed in until expiry) |
| Guest | Plain absolute URLs — no handoff |

Full write-up: `docs/NETWORK-SSO-HANDOFF.md`.

---

## Phase 4 (out of scope here)

- Full cross-hub plan sync tables  
- Subdomain migration under asktrusthub.com  
- Broadcast sign-out across all hubs  
- Account deletion / data export  

---

## Move reference (audit)

| Item | Move (movetrusthub.com) |
|------|-------------------------|
| Magic link API | `app/api/auth/magic-link` |
| Google / Facebook | `app/api/auth/google`, `…/facebook` |
| Callback / confirm | `app/auth/callback`, `app/auth/confirm` |
| UX | Magic link default; optional password; Google; Facebook |
| Env | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

---

## Human tests

1. Guest My Insurance works without account.  
2. Magic link or Google → signed in; same user id as Move when env is shared.  
3. Sign out → multi-plan library remains.  
4. No login wall on research pages.  
5. Facebook smoke-test when app review allows.  
6. **SSO:** signed in on Insurance → network bar **Lending** → land signed in on Lender (no form).  
7. Replay handoff `code` twice → second fails soft.  
8. Logged out → network links are plain public URLs.
