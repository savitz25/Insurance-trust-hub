# Insurance Trust Hub

An independent, authoritative directory platform helping individuals and families relocating to new cities identify, compare, and connect with licensed insurance providers for homeowners, auto, health, Medicare, renters, and related personal insurance needs.

**Independent directory. Not affiliated with any insurance carrier, agency, or agent.** All information is for research purposes only. Always verify licensing directly with your state's Department of Insurance, NAIC, or official sources before engaging any provider.

Built with the same trust-first, educational approach as [MoveTrustHub.com](https://www.movetrusthub.com).

## Tech Stack

- **Next.js 15** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4** + shadcn/ui-style components
- **Supabase** (PostgreSQL, Auth, Row Level Security)
- **React Hook Form** + Zod validation
- **Lucide React** icons
- Deploy-ready for **Vercel**

## Features

- **Homepage** — Hero search, trust bar, how-it-works, popular destinations, category highlights
- **Directory** (`/directory`) — Advanced filters, sort, list/grid views, verified license badges
- **Provider Profiles** (`/providers/[slug]`) — License verification links, reviews, lead forms, JSON-LD
- **Destinations** — State and city pages with insurance landscape guidance for high-move markets
- **Resources** — 8 in-depth relocation insurance guides
- **Tools** — License verification guide, needs assessment quiz, cost estimator
- **Admin Dashboard** (`/admin`) — Provider CRUD, review moderation, leads overview

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/savitz25/Insurance-trust-hub.git
cd Insurance-trust-hub
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Yes | Production URL for SEO/sitemap |
| `NEXT_PUBLIC_SUPABASE_URL` | For DB | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For DB | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | For admin | Service role key (server only) |
| `ADMIN_SECRET` | For admin | Password for `/admin/login` |
| `DATABASE_URL` | For seed | Postgres connection string |

> **Without Supabase:** The site runs with 50 built-in fallback providers. Forms log to console in development.

### 3. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Run `supabase/seed.sql` to load 50 mock providers
4. Or use the seed script:

```bash
npm run db:schema   # Apply schema + seed via DATABASE_URL
npm run db:seed     # Seed only
```

5. Create an admin user in Supabase Auth, then:

```sql
INSERT INTO admin_profiles (id, email, full_name)
VALUES ('<auth-user-uuid>', 'admin@example.com', 'Admin User');
```

### 4. Local development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin: [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

### 5. Production build

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push to GitHub and import the repo in [Vercel](https://vercel.com)
2. Add all environment variables from `.env.example`
3. Deploy — Vercel auto-detects Next.js

### Supabase + Vercel checklist

- [ ] Schema and seed applied in Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (encrypted, server-only)
- [ ] `ADMIN_SECRET` set to a strong random value
- [ ] `NEXT_PUBLIC_SITE_URL` set to your production domain

## Project Structure

```
app/                  # Next.js App Router pages
components/           # UI and feature components
lib/                  # Supabase clients, queries, SEO, validations
types/                # TypeScript types
supabase/             # schema.sql, seed.sql
scripts/              # Database seed script
public/brand/         # Logo assets
```

## Adding Real Provider Data

1. Use the admin dashboard at `/admin/providers` to add/edit providers
2. Or bulk import via CSV (map columns to provider fields) using the API at `/api/admin/providers`
3. Set `verified: true` only after confirming license status with state DOI records
4. Update `license_info` JSON with official verification URLs

## Email Notifications (Optional)

To notify on new leads, add [Resend](https://resend.com):

```
RESEND_API_KEY=re_xxxxxxxx
LEAD_NOTIFICATION_EMAIL=hello@insurancetrusthub.com
```

Extend `lib/actions/leads.ts` to send emails on successful submission.

## License & Disclaimer

Insurance Trust Hub is an independent informational resource. We do not sell insurance, receive commissions from carriers, or guarantee the accuracy of third-party listings. Users must independently verify all licensing and coverage details.

## Related

Planning the physical move too? Visit [MoveTrustHub.com](https://www.movetrusthub.com) for verified moving company directories and relocation tools.