# Insurance Trust Hub — Email Routing

**Public network address:** `hello@asktrusthub.com`
**Monitored operator inbox:** `info@movetrusthub.com` (Google Workspace)  
**Inbound forwarder:** ImprovMX  
**Outbound transactional:** Resend  

**Full ImprovMX + Vercel steps:** [IMPROVMX-SETUP.md](./IMPROVMX-SETUP.md)

---

## Final routing map

```text
hello@insurancetrusthub.com     → info@movetrusthub.com   (ImprovMX)
contact@insurancetrusthub.com   → info@movetrusthub.com   (ImprovMX alias)
*@insurancetrusthub.com         → info@movetrusthub.com   (ImprovMX catch-all)
```

Form / lead notifications (Resend **TO**, not inbound):

```text
OPERATOR_INBOX / LEAD_NOTIFICATION_EMAIL → info@movetrusthub.com
```

---

## Systems of record

| Concern | System | Notes |
|---------|--------|--------|
| Inbound `@insurancetrusthub.com` | **ImprovMX** + Vercel **MX/SPF** | Required for mailto:hello@ |
| Human read/reply | **Google Workspace** `info@movetrusthub.com` | `movetrusthub.com` MX → `smtp.google.com` |
| App outbound | **Resend** | DKIM `resend._domainkey`, SPF on `send.` subdomain |
| Do not touch | Move / Ask / Lender domains | Separate MX |

---

## DNS (Insurance apex)

| Type | Host | Value | Purpose |
|------|------|--------|---------|
| MX | `@` | `mx1.improvmx.com` (10) | Inbound |
| MX | `@` | `mx2.improvmx.com` (20) | Inbound |
| TXT | `@` | `v=spf1 include:spf.improvmx.com ~all` | ImprovMX SPF (one SPF only) |
| TXT | `resend._domainkey` | (Resend value) | Outbound DKIM — keep |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | Outbound SPF — keep |

Verify anytime:

```bash
node scripts/improvmx-dns.mjs verify
```

---

## Public addresses inventory

| Address | Published? | Destination |
|---------|------------|-------------|
| `hello@insurancetrusthub.com` | Yes (site) | ImprovMX → `info@movetrusthub.com` |
| `contact@insurancetrusthub.com` | No (alias only) | Same |
| Catch-all `*` | No (forward only) | Same |
| `info@movetrusthub.com` | Operator | Native Workspace mailbox |

---

## App layer

| Path | Behavior |
|------|----------|
| Contact form | Resend → operator inbox; Reply-To = visitor |
| Lead form | DB + Resend → operator; Reply-To = visitor |
| My Insurance mail | From brand `hello@` via Resend |
| Footer / mailto | `hello@asktrusthub.com` |

Code: `lib/email/routing.ts`, `lib/email/resend.ts`, `lib/actions/contact.ts`, `lib/actions/leads.ts`.

Env:

```bash
RESEND_API_KEY=re_…
RESEND_FROM=Insurance Trust Hub <hello@insurancetrusthub.com>
OPERATOR_INBOX=info@movetrusthub.com
```

---

## QA checklist

- [ ] ImprovMX domain **Active**
- [ ] `node scripts/improvmx-dns.mjs verify` **PASS**
- [ ] External → `hello@` arrives in `info@` (not only spam)
- [ ] External → catch-all test address arrives
- [ ] Contact form notifies `info@` with sensible Reply-To
- [ ] Resend outbound still works
- [ ] Move / Lender / Ask mail unchanged

---

## Last public DNS probe

Run `verify` after applying Vercel preset. As of pre-apply probe: **no apex MX** (inbound broken until ImprovMX MX is published).
