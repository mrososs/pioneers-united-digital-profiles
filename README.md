# Pioneers United Digital Profiles

A premium executive Digital Identity platform for **Pioneers United**.

Each executive gets one durable link — `profile.pioneersunited.com/en/their-name` — that
carries a bilingual public profile, a downloadable contact card, a QR code and a wallet
pass. The link is designed to be printed on business cards and shared over WhatsApp and
LinkedIn.

Deployed separately from the corporate website at `https://pioneersunited.com`.

| | |
|---|---|
| Target domain | `profile.pioneersunited.com` |
| Stack | Nuxt 4 · Vue 3 · TypeScript · Tailwind CSS v4 · Supabase |
| Package manager | pnpm |
| Languages | English (LTR) · Arabic (RTL) |

## Capabilities

- Public executive Digital Profiles, Arabic and English
- Public company Digital Profile
- vCard (`.vcf`) generation with correct Arabic encoding
- QR codes — on-screen, PNG, SVG, brand-coloured
- Apple Wallet and Google Wallet — *service boundaries in place, awaiting credentials*
- Administrative dashboard with profile creation, editing and publishing
- Row Level Security throughout: anonymous visitors can read published profiles and nothing else

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | ≥ 20.19 | 24.x tested |
| pnpm | 11.x | `npm install -g pnpm` |
| Docker Desktop | current | Only for the local Supabase stack |
| Supabase account | — | For a hosted project |

The Supabase CLI is a dev dependency — no separate install needed. Use it via
`pnpm exec supabase …`.

---

## Setup

```bash
pnpm install          # also runs `nuxt prepare` to generate types
cp .env.example .env  # then fill it in — see below
```

### Option A — local Supabase (recommended for development)

```bash
pnpm db:start         # starts Postgres, Auth, Storage and Studio in Docker
pnpm db:status        # prints the local URL and keys
```

Copy the printed values into `.env`:

```env
NUXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NUXT_PUBLIC_SUPABASE_KEY=<the publishable / anon key from db:status>
SUPABASE_SECRET_KEY=<the secret / service_role key from db:status>
NUXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then create the schema and seed development data:

```bash
pnpm db:reset         # applies every migration, then supabase/seed.sql
pnpm db:types         # regenerate TypeScript types from the schema
pnpm dev              # http://localhost:3000
```

You now have:

| URL | What |
|---|---|
| `http://localhost:3000/en` | Public landing page |
| `http://localhost:3000/en/sample-executive` | A published sample profile |
| `http://localhost:3000/ar/sample-executive` | The same profile in Arabic (RTL) |
| `http://localhost:3000/en/admin/login` | Dashboard sign-in |
| `http://localhost:3000/api/profiles/sample-executive/vcard` | vCard download |
| `http://localhost:3000/api/profiles/sample-executive/qr` | QR code (SVG) |

Local development login: `dev-admin@example.test` / `LocalDevOnly!2026`.
Seeded by `supabase/seed.sql`, local only, never valid anywhere else.

`http://localhost:3000/en/unpublished-example` returns **404** by design — it is a draft,
which proves Row Level Security is working.

### Option B — hosted Supabase project

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <your-project-ref>
pnpm db:push            # apply migrations to the linked project
pnpm db:types:linked    # regenerate types from it
```

`supabase/seed.sql` is **not** applied by `db:push`. Create real administrators through the
Supabase dashboard — see "Supabase dashboard setup" below.

---

## Environment variables

Full documentation, with the reasoning for each, is in `.env.example`. Summary:

### Required

| Variable | Exposed to browser | Purpose |
|---|---|---|
| `NUXT_PUBLIC_SITE_URL` | yes | Canonical origin. Used for canonical URLs, Open Graph tags, **QR payloads** and vCard URLs. Must be correct in production. |
| `NUXT_PUBLIC_SUPABASE_URL` | yes | Supabase project API URL |
| `NUXT_PUBLIC_SUPABASE_KEY` | yes | Publishable (anon) key. Safe to expose — subject to RLS. |
| `SUPABASE_SECRET_KEY` | **no** | Secret / service-role key. **Bypasses RLS.** Server-only. |

### Optional

| Variable | Purpose |
|---|---|
| `NUXT_PUBLIC_DEFAULT_ORGANIZATION_SLUG` | Default tenant slug (`pioneers-united`) |
| `NUXT_LOG_LEVEL` | `trace` … `error` … `silent`. Default `info`. |
| `NUXT_WALLET_APPLE_*` | Apple Wallet credentials. Blank ⇒ Apple endpoints answer 503. |
| `NUXT_WALLET_GOOGLE_*` | Google Wallet credentials. Blank ⇒ Google endpoints answer 503. |

> **Never** put a secret behind a `NUXT_PUBLIC_` name — that prefix means "compiled into
> the browser bundle". `.env` is git-ignored; keep it that way.

---

## Local development

```bash
pnpm dev              # dev server with HMR
pnpm build            # production build to .output/
pnpm preview          # serve the built output
```

The app runs without Supabase configured — the landing page and dashboard login render, and
profile routes return errors. Configure Supabase to exercise the full product.

---

## Scripts

```bash
# Development
pnpm dev                  # dev server
pnpm build                # production build
pnpm preview              # serve the build

# Quality
pnpm lint                 # ESLint
pnpm lint:fix             # ESLint with autofix
pnpm typecheck            # vue-tsc across app, server and shared
pnpm test                 # Vitest — unit, integration and component projects
pnpm test:watch           # Vitest watch mode
pnpm verify               # lint && typecheck && test && build

# Supabase (Docker required)
pnpm db:start             # start the local stack
pnpm db:status            # local URLs and keys
pnpm db:stop              # stop the stack
pnpm db:reset             # re-run all migrations, then seed.sql  (local only)
pnpm db:diff              # diff local schema against migrations
pnpm db:push              # apply migrations to the linked project
pnpm db:types             # regenerate types from local
pnpm db:types:linked      # regenerate types from the linked project
```

---

## Database migrations

Schema changes happen **only** through migrations. See `supabase/CLAUDE.md` for the rules.

```bash
pnpm exec supabase migration new add_something   # create a timestamped file
# edit supabase/migrations/<timestamp>_add_something.sql
pnpm db:reset                                    # verify it applies from empty
pnpm db:types                                    # regenerate types
pnpm db:push                                     # apply to the linked project
```

Never rename or edit a migration that has already been applied anywhere — fix it forward
with a new one. Always commit the regenerated `shared/types/database.types.ts` alongside.

### Tables

| Table | Purpose |
|---|---|
| `organizations` | Tenants. Currently one row: Pioneers United. |
| `organization_branding` | Colours and brand asset keys (1:1 with organizations) |
| `admin_users` | Dashboard operators and their role. **The only source of truth for a role.** |
| `profiles` | Digital Profiles — individual and company |
| `profile_links` | Ordered, toggleable extra links per profile |
| `wallet_passes` | Wallet pass bookkeeping. Contains no credentials. |
| `integration_settings` | Non-secret provider configuration |

Details, including the reasoning behind each decision, are in `docs/architecture.md` and
the migration file headers.

---

## Supabase dashboard setup

For a hosted project, after `pnpm db:push`:

1. **Authentication → Providers** — enable **Email**. Disable "Confirm email" only if
   administrators are provisioned manually (recommended), otherwise leave it on.
2. **Authentication → Providers → Email** — disable **Allow new users to sign up**. There is
   no public registration in this product; administrators are created deliberately.
3. **Authentication → URL Configuration** — set Site URL to
   `https://profile.pioneersunited.com` and add it to Redirect URLs, plus
   `http://localhost:3000` for development.
4. **Authentication → Users → Add user** — create each administrator.
5. **SQL Editor** — grant dashboard access by inserting the matching `admin_users` row:

   ```sql
   insert into public.admin_users (id, organization_id, role, full_name, is_active)
   values (
     '<auth user uuid>',
     (select id from public.organizations where slug = 'pioneers-united'),
     'super_admin',
     'Full Name',
     true
   );
   ```

   Creating the auth user alone grants nothing — this row is what authorizes them.
6. **Storage** — confirm `profile-media`, `brand-assets` and `wallet-passes` exist. The
   migration creates them; verify `wallet-passes` is **private**.
7. **Project Settings → API keys** — copy the publishable and secret keys into the
   deployment environment. Never commit them.

Verify RLS afterwards: open a published profile URL in a private window (it should render)
and a draft profile URL (it should 404).

---

## Deployment overview

Any Node-capable host works; the build output is a standard Nitro server.

```bash
pnpm install --frozen-lockfile
pnpm build
node .output/server/index.mjs    # or the platform's own start command
```

Checklist:

1. Set every required environment variable in the platform, `SUPABASE_SECRET_KEY` as a
   **secret**, not plain text.
2. `NUXT_PUBLIC_SITE_URL=https://profile.pioneersunited.com` — QR codes and vCards encode
   this, and printed material cannot be reissued.
3. Point `profile.pioneersunited.com` at the deployment (a `CNAME` for most platforms) and
   confirm TLS. Session cookies are `Secure`, so HTTPS is required.
4. Apply migrations to the production database (`pnpm db:push`) **before** the first deploy.
5. Confirm `X-Robots-Tag: noindex` on `/en/admin/*` and that `/robots.txt` is served.
6. Create administrators as above. There is no public sign-up.

More detail, including the wallet rollout, is in `docs/deployment.md`.

---

## Documentation

| File | Contents |
|---|---|
| `CLAUDE.md` | Project instructions, core rules, terminology, domains |
| `app/CLAUDE.md` | Frontend rules — components, i18n, RTL, tokens, accessibility |
| `server/CLAUDE.md` | Server rules — API, validation, authorization, errors, wallet |
| `supabase/CLAUDE.md` | Database rules — migrations, RLS, indexes, seed, types |
| `docs/architecture.md` | High-level architecture and the decisions behind it |
| `docs/storage.md` | Bucket strategy, permissions, MIME and size policy |
| `docs/security.md` | Threat model and the controls that answer it |
| `docs/wallet.md` | What Apple and Google Wallet still need |
| `docs/deployment.md` | Environments, DNS, rollout |

---

## Project status

Foundation complete and verified: lint, typecheck, 104 tests and a production build all
pass; routing, i18n, RTL, SEO metadata and admin protection are confirmed working against a
running server.

Not yet done, and why:

- **Apple / Google Wallet generation** — awaiting client credentials. Service boundaries and
  status reporting are in place; each adapter documents exactly what implementing it needs.
- **Photo upload and link editor UI** — server endpoints are complete and enforced; the
  dashboard controls arrive with the design system.
- **Final visual design** — tokens are placeholders derived from the supplied brand logo.
  When the design system lands, only the `:root` block in `app/assets/css/main.css` changes.
