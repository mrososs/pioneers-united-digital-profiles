# CLAUDE.md — Pioneers United Digital Profiles

Instructions for any Claude Code session working in this repository. Read this first.
Nested files add area-specific rules: `app/CLAUDE.md`, `server/CLAUDE.md`,
`supabase/CLAUDE.md`. Read the nested file for the area you are touching.

---

## Project

**Pioneers United Digital Profiles** — a premium executive Digital Identity platform.

Deployed separately from the corporate website:

| | |
|---|---|
| This product | `profile.pioneersunited.com` |
| Corporate site | `https://pioneersunited.com` (not in this repository) |

## Product purpose

One durable link per executive that carries their professional identity: a bilingual
public profile, a downloadable contact card, a QR code and a wallet pass. The link is
meant to be printed on business cards and shared over WhatsApp and LinkedIn, which is why
**the canonical URL is treated as immutable infrastructure** — see "Core rules".

Delivered capabilities:

1. Public executive Digital Profiles (Arabic + English)
2. Public company Digital Profile
3. vCard (`.vcf`) generation
4. QR codes (display, PNG, SVG, brand colours)
5. Apple Wallet integration — **service boundary only, awaiting credentials**
6. Google Wallet integration — **service boundary only, awaiting credentials**
7. Administrative dashboard
8. Profile creation / editing / publishing
9. Arabic RTL + English LTR throughout

---

## Stack

Exactly what is installed. Check `package.json` before assuming a version.

| Concern | Choice | Version |
|---|---|---|
| Framework | Nuxt | 4.5 |
| UI | Vue 3 (`<script setup lang="ts">`) | 3.5 |
| Language | TypeScript, strict | 5.9 |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` | 4.3 |
| Backend | Supabase (PostgreSQL, Auth, Storage) | — |
| Supabase integration | `@nuxtjs/supabase` | 2.0 |
| Supabase SDK | `@supabase/supabase-js` | 2.112 |
| i18n | `@nuxtjs/i18n` | 10.6 |
| Validation | Zod | 4.4 |
| QR | `qrcode` | 1.5 |
| Lint | ESLint 10 via `@nuxt/eslint` (flat config, stylistic) | 1.17 |
| Tests | Vitest 4 + `@nuxt/test-utils` + `@vue/test-utils` + happy-dom | — |
| Server runtime | Nitro (bundled with Nuxt) | — |
| Package manager | **pnpm** (11.x) | — |
| Supabase CLI | `supabase` dev dependency | 2.114 |

Notes on deliberate choices:

- **No Prettier.** ESLint stylistic rules do the formatting. Adding Prettier would create
  two sources of truth that fight each other. Run `pnpm lint:fix`.
- **No UI component library.** The design system arrives separately; `app/components/app/`
  is the primitive layer it will plug into.
- **No state-management library.** `useState` covers the little cross-component state this
  app has. Do not add Pinia without a concrete need.
- **Tailwind v4 has no `tailwind.config.js`.** Tokens are CSS, in
  `app/assets/css/main.css`.

---

## Architecture

```text
app/                    Nuxt srcDir — everything client-side
  assets/css/main.css     Design tokens (@theme inline) + base layer. THE styling source.
  assets/img/             Brand assets imported by components
  components/app/         Design-system primitives (AppButton, AppInput, ...)
  components/profile/     Public profile domain components
  components/admin/       Dashboard domain components
  components/layout/      Chrome: BrandLogo, LocaleSwitcher, PublicFooter
  composables/            Client-side reusable logic
  layouts/                default (public) · admin (dashboard) · auth (login)
  middleware/             admin-auth, admin-guest — NAVIGATION only, never authorization
  pages/                  Routing. Orchestration only, no business logic.
  utils/                  Pure client helpers (redirect allow-list)

server/                 Nitro — the only place secrets exist
  api/public/             Anonymous read endpoints
  api/profiles/           vCard + QR (public, published profiles only)
  api/wallet/             Public "add to wallet" endpoints
  api/admin/              Authenticated dashboard endpoints
  middleware/             Request correlation id
  repositories/           Data access + the row→DTO mapper. SQL only, no rules.
  services/               Business rules: profile, organization, vcard, qr, wallet
  utils/                  auth, errors, logger, validation, urls

shared/                 Imported by BOTH app and server via #shared/*
  constants/              Enum mirrors of the database, storage policy, roles
  schemas/                Zod schemas — one definition, used on client AND server
  types/                  DTO contracts + database.types.ts (generated)

supabase/
  migrations/             The only way schema changes happen
  seed.sql                LOCAL DEVELOPMENT ONLY
  config.toml             Local stack configuration

i18n/
  locales/en.json ar.json Translation catalogues
  i18n.config.ts          vue-i18n runtime options

tests/
  unit/                   Pure logic, Node environment, fast
  integration/            Cross-module behaviour with mocked boundaries
  component/              Nuxt runtime environment, real Vue rendering

docs/                   Architecture, database, storage, security, wallet, deployment
```

### The layering rule

```text
page/component  →  API route  →  service  →  repository  →  Supabase
   (render)        (transport)   (rules)      (SQL)
```

Never skip a layer. In particular a page must never call Supabase directly: doing so
bypasses validation, locale resolution and the public/private field split, and the same
logic then has to be reimplemented for the next surface that needs it.

### Request flow, public profile

`/en/mohammed-alqahtani` → `app/pages/[slug].vue` → `GET /api/public/profiles/:slug`
→ `getPublicProfile()` → request-scoped Supabase client (**RLS applies**) →
`toPublicProfile()` strips internal fields and resolves the locale → `ProfileView`.

### Routing decisions

- **`i18n` strategy is `prefix`.** Every public URL is explicitly locale-scoped
  (`/en/{slug}`, `/ar/{slug}`) so a shared link always opens in the language it was
  shared in. `/` redirects to the detected locale.
- **Admin lives under the locale prefix too** (`/en/admin/...`, `/ar/admin/...`) because
  the dashboard is bilingual. `routeRules` redirect unprefixed `/admin/**` to
  `/en/admin/**` for convenience.
- **One page file per route, both locales.** There is no separate Arabic page. If you
  find yourself duplicating a page for Arabic, stop — that is the bug.
- **The company profile is an ordinary `profiles` row** with `profile_type = 'company'`.
  Same route, same components, same code path.

---

## Development commands

All verified working. Use pnpm; do not mix package managers.

```bash
# Setup
pnpm install                 # also runs `nuxt prepare`
cp .env.example .env         # then fill in the values

# Develop
pnpm dev                     # http://localhost:3000
pnpm build                   # production build to .output/
pnpm preview                 # serve the built output

# Quality — run these before reporting a task complete
pnpm lint                    # ESLint
pnpm lint:fix                # ESLint with autofix
pnpm typecheck               # vue-tsc across app, server, shared
pnpm test                    # Vitest, all projects
pnpm test:watch              # Vitest watch mode
pnpm verify                  # lint && typecheck && test && build

# Supabase local development (requires Docker running)
pnpm db:start                # start the local stack
pnpm db:status               # show local URLs and keys
pnpm db:stop                 # stop the local stack
pnpm db:reset                # re-run every migration, then seed.sql
pnpm db:diff                 # diff local schema against migrations

# Migrations and types
pnpm exec supabase migration new <name>   # create a timestamped migration
pnpm db:push                              # apply migrations to the LINKED project
pnpm db:types                             # regenerate types from the LOCAL database
pnpm db:types:linked                      # regenerate types from the LINKED project
```

`pnpm db:*` commands need Docker Desktop running. `pnpm dev`, `lint`, `typecheck`, `test`
and `build` do not.

---

## Core rules

**TypeScript**

- Strict mode, plus `noUncheckedIndexedAccess`, `noImplicitOverride`,
  `noImplicitReturns`, `noFallthroughCasesInSwitch`.
- **No `any`.** ESLint enforces it. Use `unknown` plus a narrowing guard. If an exception
  is genuinely unavoidable, document why in a comment on the line above.
- Prefer `import type` for type-only imports.

**Vue**

- Composition API with `<script setup lang="ts">`. Options API is not used here.
- Block order: `<script>` → `<template>` → `<style>`.
- Props and emits typed via generics (`defineProps<{...}>()`), `defineModel` for
  two-way bindings.
- Derive with `computed`; use watchers for side effects only. Keep filtering and sorting
  out of templates.
- `shallowRef` for primitives, `ref`/`reactive` for objects per the usual guidance.
- **No business logic in page templates.** Pages fetch, set metadata and compose.
- Prefer many small components over one large one. Split when a component owns more than
  one responsibility.

**Security**

- **Server secrets never reach the client.** `SUPABASE_SECRET_KEY`, Apple certificates and
  Google service-account keys exist only in `server/` via `useRuntimeConfig()`.
  Never behind a `NUXT_PUBLIC_` name, never in the database, never in a log.
- **Validate every external input** with the Zod schema in `shared/schemas/`. Browser
  validation is a courtesy; the server parse is the boundary.
- **Authorization is server-side.** `app/middleware/admin-auth.ts` decides what to render.
  `server/utils/auth.ts` decides what is permitted.
- **Maintain RLS.** Every new table gets `ENABLE ROW LEVEL SECURITY` and explicit policies
  in the same migration. Anonymous users may read published profiles and nothing else.
- Never expose internal errors to users — see `server/utils/errors.ts`.

**Product**

- **Public profiles are mobile-first.** They are opened from a QR code or a WhatsApp
  message. Design for a phone, then widen.
- **Arabic and English are equals.** Both must work. Consider RTL for every new piece of
  UI; use logical Tailwind utilities (`ps-*`, `pe-*`, `text-start`), never `pl-*`/`text-left`.
- **No hardcoded English strings** in components. Everything goes through `t()` and both
  locale files.
- **Semantic design tokens only.** `bg-surface`, `text-muted-fg`, `border-border`. Never a
  raw hex value, never `bg-[#192341]`. Tokens live in `app/assets/css/main.css`.
- **Accessibility is required, not optional.** Labelled controls, keyboard operability,
  visible focus, correct roles, meaningful alt text.
- **Never hardcode profile data.** Everything comes from the database. The only fixture
  data lives in `supabase/seed.sql` and is local-only.
- **The canonical profile URL is infrastructure.** It is encoded in printed QR codes.
  Changing a slug breaks physical material — treat it as a migration, not an edit.
- **Never bypass migrations.** No manual schema edits in the Supabase dashboard.
- **Avoid unnecessary dependencies.** Prefer the platform. Every addition is a security
  and maintenance liability.

---

## Product terminology

Use these words consistently, in code, UI copy and commits.

| Term | Meaning |
|---|---|
| **Profile** | A row in `profiles`. The unit of the product. |
| **Individual Profile** | `profile_type = 'individual'` — one executive. |
| **Company Profile** | `profile_type = 'company'` — the organization's own profile. |
| **Digital Profile** | The public, rendered page. What a visitor sees. |
| **vCard** | The `.vcf` contact file generated from a profile. |
| **QR** | A QR code encoding a profile's canonical URL. Never persisted. |
| **Wallet Pass** | An Apple Wallet `.pkpass` or Google Wallet object for a profile. |
| **Organization** | A row in `organizations`. The tenant. Currently Pioneers United. |
| **Admin** | An operator with a row in `admin_users`. Role `admin` or `super_admin`. |
| **Slug** | The globally unique URL segment identifying a profile. |
| **Status** | `draft` · `published` · `inactive`. Only `published` is publicly visible. |

Avoid: "user" for an executive (they have no account), "card" for a profile, "tenant" in
user-facing copy.

---

## Important domains

| Domain | Where it lives | What it owns |
|---|---|---|
| **auth** | `server/utils/auth.ts`, `app/middleware/`, `app/composables/useAdminSession.ts` | Who is signed in, what they may do. Supabase Auth email/password; role from `admin_users`, never from a JWT claim. |
| **profiles** | `server/services/profile.service.ts`, `server/repositories/`, `shared/schemas/profile.schema.ts` | The core CRUD + publication lifecycle, locale resolution, the public/private field split. |
| **company** | `server/services/organization.service.ts` | Organization details shown on the company profile and embedded in every vCard. |
| **contacts** | `profiles` columns + `profile_links` table | Canonical channels are columns (the vCard needs to know which field is the work phone); open-ended ordered links are rows. |
| **qr** | `server/services/qr/qr.service.ts` | Renders SVG/PNG on demand from the canonical URL. Nothing is stored. |
| **vcard** | `server/services/vcard/vcard.service.ts` | vCard 3.0 with `CHARSET=UTF-8`, one card per locale. Pure function, unit-tested. |
| **wallet** | `server/services/wallet/` | Provider-agnostic boundary (`WalletProviderAdapter`) plus one adapter per provider. **Not implemented — awaiting credentials.** |
| **branding** | `organization_branding` table, `app/assets/css/main.css` | Colours and asset keys that feed the semantic tokens. Colours only — never raw CSS. |
| **settings** | `server/api/admin/organization*`, `branding*`, `integrations*` | Company details, branding, non-secret provider configuration. |
| **storage** | `shared/constants/storage.ts`, `server/api/admin/media/upload.post.ts` | Bucket strategy, MIME allow-list, size caps, derived object keys. |
| **admin** | `app/pages/admin/`, `server/api/admin/` | The dashboard. Never indexed. |

---

## Before completing a task

Run, and make them pass:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Run `pnpm build` as well when you have changed `nuxt.config.ts`, added a dependency,
touched anything under `server/`, or changed the design tokens.

When you have changed the database schema, additionally:

```bash
pnpm db:reset      # proves the migrations apply from scratch
pnpm db:types      # regenerate shared/types/database.types.ts, and commit it
```

**Never report a task complete if verification failed.** Report what failed, with the
actual output. A partially working change described accurately is far more useful than a
broken change described as done.

---

## Current state and known gaps

Accurate as of the bootstrap. Update this section as things change.

- **Apple Wallet and Google Wallet are not implemented.** The adapters report themselves
  unconfigured and refuse to generate. Each file documents exactly what implementing it
  involves. Requires credentials from the client.
- **The photo uploader and link editor have no UI.** The server endpoints
  (`/api/admin/media/upload`, `links` on the profile payload) are complete and enforced;
  the dashboard controls are the natural first addition once the design system lands.
- **Design tokens are placeholders.** `--pu-primary: #192341` and `--pu-accent: #e18146`
  were read out of the supplied brand logo. The rest is a neutral accessible scale. When
  the design system arrives, only the `:root` block in `app/assets/css/main.css` changes.
- **Migrations have not been executed against a live database yet.** They were authored
  but Docker was unavailable in the bootstrap environment. Run `pnpm db:reset` as the
  first step of local setup and fix anything it reports.
- **No sitemap.** `public/robots.txt` references one. Add `@nuxtjs/sitemap` when public
  profiles go live, or remove the reference.
