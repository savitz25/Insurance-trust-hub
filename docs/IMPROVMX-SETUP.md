# Insurance Trust Hub — ImprovMX inbound setup

**Goal:** All `@insurancetrusthub.com` mail → monitored inbox **`info@movetrusthub.com`**.

| Role | System |
|------|--------|
| **Inbound receive / forward** | **ImprovMX** |
| **Outbound app mail** | **Resend** (forms, My Insurance) |
| **Human monitoring** | **Google Workspace** `info@movetrusthub.com` |
| **DNS host** | **Vercel** (`ns1` / `ns2.vercel-dns.com`) |

Do **not** change MX on `movetrusthub.com`, `lendertrusthub.com`, or `asktrusthub.com` for this task.

---

## Final routing map

```text
hello@insurancetrusthub.com     → info@movetrusthub.com
contact@insurancetrusthub.com   → info@movetrusthub.com
*@insurancetrusthub.com         → info@movetrusthub.com
```

**Published on site:** `hello@insurancetrusthub.com` only (footer, contact, legal).  
`contact@` and catch-all exist for delivery robustness; they are not required in public UI.

---

## 1. ImprovMX dashboard

1. Open [app.improvmx.com](https://app.improvmx.com).
2. Add domain **`insurancetrusthub.com`** if missing.
3. Set notification / destination awareness to **`info@movetrusthub.com`** (verify destination ownership when ImprovMX asks).
4. Aliases (remove blank rows):
   - `hello` → `info@movetrusthub.com`
   - `contact` → `info@movetrusthub.com`
   - `*` (catch-all) → `info@movetrusthub.com`
5. Leave domain on **Setup** until DNS verifies; goal is **Email forwarding active** / Active.

API automation (optional):

```bash
# PowerShell
$env:IMPROVMX_API_KEY = "your-key"   # Account → API
node scripts/improvmx-dns.mjs apply-improvmx
```

---

## 2. Vercel DNS (required)

### Fast path (recommended)

1. [vercel.com](https://vercel.com) → team → **Domains**
2. Open **`insurancetrusthub.com`**
3. **Add DNS Preset** → **ImprovMX [MX]** → **Add records**
4. Delete any **non-ImprovMX** apex MX records
5. Confirm records match:

| Type | Name | Priority | Value |
|------|------|----------|--------|
| MX | `@` | 10 | `mx1.improvmx.com` |
| MX | `@` | 20 | `mx2.improvmx.com` |
| TXT | `@` | — | `v=spf1 include:spf.improvmx.com ~all` |

### Do not remove (outbound Resend)

Keep these for **sending** (not inbound):

- `resend._domainkey` (or Resend’s DKIM hosts)
- `send` subdomain SPF / MX used by Resend/SES

Apex ImprovMX SPF does **not** replace `send.insurancetrusthub.com` SPF.

### Only one SPF at apex

If multiple `v=spf1` TXT records exist at `@`, merge into **one**.  
Do not create a second competing SPF.

### CLI automation (optional)

```bash
$env:VERCEL_TOKEN = "…"
# $env:VERCEL_TEAM_ID = "…"   # if team-scoped
node scripts/improvmx-dns.mjs apply-vercel
```

---

## 3. Verify

### Public DNS

```bash
node scripts/improvmx-dns.mjs verify
```

Expect:

- MX → `mx1.improvmx.com` + `mx2.improvmx.com` only  
- Apex SPF includes `include:spf.improvmx.com`  
- Single SPF TXT at apex  

Or:

```text
https://dns.google/resolve?name=insurancetrusthub.com&type=MX
https://inspector.improvmx.com   (lookup insurancetrusthub.com)
```

### ImprovMX UI

Domain status → **Active / Email forwarding active**. Use **Check again** after DNS.

### Delivery tests (external account ≠ info@)

1. To: `hello@insurancetrusthub.com`  
2. To: `contact@insurancetrusthub.com`  
3. To: `test-forward@insurancetrusthub.com` (catch-all)

Confirm in **`info@movetrusthub.com`** (inbox + spam). Check ImprovMX logs if available.

---

## 4. Site alignment

| Surface | Address |
|---------|---------|
| Footer / contact / privacy / terms / schema | `hello@insurancetrusthub.com` |
| Form notifications (Resend TO) | `info@movetrusthub.com` via `OPERATOR_INBOX` |
| Resend From | `Insurance Trust Hub <hello@insurancetrusthub.com>` |

Code map: `lib/constants.ts` (`SITE_EMAIL`), `lib/email/routing.ts`.

---

## 5. Outbound vs inbound

```text
Internet → MX improvmx → forward → info@movetrusthub.com     (inbound)
App/Vercel → Resend API → From hello@ (verified) → recipient (outbound)
```

Resend **never** receives `hello@` mail.

---

## Status log

| Date | Note |
|------|------|
| 2026-08-08 | Diagnosed: **no MX** on Insurance domain (Vercel DNS). Scripts + docs ready. Apply requires Vercel/ImprovMX credentials or dashboard click-through. |
