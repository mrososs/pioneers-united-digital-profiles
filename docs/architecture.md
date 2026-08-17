# Architecture

How Pioneers United Digital Profiles is put together, and why.

---

## System overview

```text
                    ┌─────────────────────────────────────────────┐
                    │            Public visitor                    │
                    │  (QR scan · WhatsApp link · LinkedIn post)    │
                    └───────────────────────┬──────────────────────┘
                                            │  HTTPS
                                            ▼
              ┌──────────────────────────────────────────────────────────┐
              │        Nuxt 4 — profile.pioneersunited.com                │
              │                                                           │
              │   /en/{slug}   /ar/{slug}      SSR, cacheable             │
              │   pages/[slug].vue  →  ProfileView                        │
              └───────┬───────────────┬───────────────┬──────────────────┘
                      │               │               │
        ┌─────────────▼──┐  ┌─────────▼───────┐  ┌───▼────────────────┐
        │ vCard          │  │ QR              │  │ Wallet             │
        │ /api/profiles/ │  │ /api/profiles/  │  │ /api/wallet/       │
        │   :slug/vcard  │  │   :slug/qr      │  │   :provider/:slug  │
        │                │  │                 │  │                    │
        │ vCard 3.0      │  │ SVG · PNG       │  │  ┌──────┐ ┌──────┐ │
        │ UTF-8, per     │  │ Encodes the     │  │  │Apple │ │Google│ │
        │ locale         │  │ canonical URL   │  │  │.pkpass│ │ JWT  │ │
        │                │  │ Never stored    │  │  └──┬───┘ └───┬──┘ │
        └────────┬───────┘  └────────┬────────┘  └─────┼─────────┼────┘
                 │                   │                 │         │
                 └───────────────────┴─────────┬───────┴─────────┘
                                               │
                       ┌───────────────────────▼────────────────────────┐
                       │   Nitro server  (server/)                       │
                       │                                                 │
                       │   api/        transport: parse, authorize        │
                       │   services/   business rules                    │
                       │   repositories/  SQL + row→DTO mapping          │
                       │   utils/      auth · errors · logger · urls     │
                       │                                                 │
                       │   THE ONLY PLACE SECRETS EXIST                  │
                       │   secret key · Apple cert · Google private key   │
                       └───────────────────────┬────────────────────────┘
                                               │
                       ┌───────────────────────▼────────────────────────┐
                       │                  Supabase                       │
                       │                                                 │
                       │   PostgreSQL  ── Row Level Security is the      │
                       │                  real access boundary           │
                       │   Auth        ── email/password, admins only    │
                       │   Storage     ── profile-media (public)         │
                       │                  brand-assets  (public)         │
                       │                  wallet-passes (private)        │
                       └─────────────────────────────────────────────────┘


                    ┌─────────────────────────────────────────────┐
                    │              Administrator                   │
                    └───────────────────────┬─────────────────────┘
                                            │  HTTPS, session cookie
                                            ▼
              ┌──────────────────────────────────────────────────────────┐
              │   Dashboard  /en/admin/**   ·   /ar/admin/**              │
              │   layouts/admin.vue                                       │
              │   middleware: admin-auth  →  RENDERING decision only      │
              └───────────────────────────┬──────────────────────────────┘
                                          │  $fetch
                                          ▼
              ┌──────────────────────────────────────────────────────────┐
              │   /api/admin/**                                           │
              │   requireAdmin() / requireCapability()  ← AUTHORIZATION   │
              │   assertCanManageOrganization()          ← TENANCY        │
              └───────────────────────────┬──────────────────────────────┘
                                          ▼
                                      Supabase
                          (service-role client, RLS bypassed —
                           sound only because the two checks above ran)
```

Note the asymmetry, which is deliberate:

- **Public reads use the request-scoped client**, so RLS is exercised on the real path. A
  regression in the "published only" policy breaks the public route loudly rather than
  over-sharing quietly.
- **Admin writes use the service-role client**, which bypasses RLS — sound only because the
  route already proved identity (`requireAdmin`) and the service re-proved tenancy
  (`assertCanManageOrganization`). Both halves are required.

---

## Layering

```text
page / component   →   API route   →   service   →   repository   →   Supabase
   presentation        transport        rules          SQL
```

| Layer | Owns | Must not |
|---|---|---|
| `app/pages`, `app/components` | Fetching, metadata, arrangement | Business logic, direct Supabase calls |
| `server/api` | Parsing, authorization, headers | Business logic |
| `server/services` | Rules, orchestration, DTO shaping | Raw SQL, HTTP concerns |
| `server/repositories` | Queries, row→DTO mapping | Rules, HTTP concerns |
| `shared` | Contracts used by both sides | Anything environment-specific |

The rule that matters: **a page never talks to Supabase.** Doing so bypasses validation,
locale resolution and the public/private field split, and the logic then has to be
reimplemented for the next surface that needs it.

---

## Key decisions

### 1. One page file per route, both locales

`@nuxtjs/i18n` with `strategy: 'prefix'` generates `/en/{slug}` and `/ar/{slug}` from a
single `app/pages/[slug].vue`.

*Why `prefix` and not `prefix_except_default`:* every public URL is then explicitly
locale-scoped, so a link shared in Arabic always opens in Arabic. With
`prefix_except_default`, `/mohammed-alqahtani` is ambiguous and `/en/mohammed-alqahtani`
does not exist — a poor property for a URL printed on a business card.

*Consequence:* the dashboard is also locale-prefixed (`/en/admin/...`). `routeRules`
redirect unprefixed `/admin/**` → `/en/admin/**` for convenience. Both are intentional: the
dashboard is bilingual too.

### 2. The company profile is an ordinary profile

`profile_type = 'company'` on a `profiles` row. Same route, same components, same service,
same vCard and QR pipeline.

*Alternative rejected:* a separate `company_profile` table and route. It would have
duplicated the contact actions, QR panel, wallet buttons, SEO handling and layout — five
places to keep in step to express one boolean.

### 3. Bilingual columns, not a translations table

Paired `*_en` / `*_ar` columns.

*Why:* there are exactly two locales; names are mandatory in both; and every read needs both
anyway (hreflang alternates, the language switcher, the alternate name in the vCard). A join
table would add a query and a mapping layer to buy flexibility the product does not need.
Revisit if a third locale is ever added.

### 4. Contact channels are columns; extra links are rows

`email`, `phone`, `whatsapp`, `linkedin_url`, `website_url` live on `profiles`.
Everything else lives in `profile_links`.

*Why the split rather than one or the other:*

- A **vCard needs to know which field is the work telephone.** `TEL;TYPE=WORK,VOICE` cannot
  be derived from a positional list, so the canonical channels must be named columns.
- **Extra links are open-ended, user-ordered and individually toggleable.** A column per
  network would mean a migration for every new platform and a table full of NULLs.

The boundary is therefore semantic, not arbitrary: columns are what the vCard and wallet
mapping consume; rows are what the profile page renders as a list.

### 5. QR codes are never persisted

A QR is a pure function of the canonical URL. Storing the image would create a second source
of truth that goes stale the moment a slug changes, and would need invalidation, storage and
its own RLS. Regeneration costs microseconds, so `/api/profiles/:slug/qr` renders on demand
and is cached at the HTTP layer.

**The encoded payload is always the canonical profile URL — never a query parameter.**
Accepting the payload from the client would turn the endpoint into an open QR generator
producing attacker-chosen destinations under the company's domain.

It also means a printed business card keeps working after a phone number changes: the card
points at a page, not at frozen data.

### 6. Wallet providers behind one interface

`WalletProviderAdapter` in `server/services/wallet/types.ts`, one adapter per provider,
resolved through `walletAdapter(provider)`.

Apple and Google share nothing at the protocol level — one signs a ZIP of JSON and PNGs with
a PKCS#7 detached signature, the other authenticates a service account over OAuth2 and
returns a JWT-signed link. Forcing both behind one shape means the dashboard, the public
buttons and the bookkeeping repository depend only on that shape. Implementing either is one
file, and nothing else moves.

Neither is implemented — no credentials have been supplied. `status()` reports which
environment variables are missing; the endpoints answer 503 `not_configured`; the UI hides
the buttons. See `docs/wallet.md`.

### 7. Generated database types are committed

`shared/types/database.types.ts` is generated by `supabase gen types` and committed, so
`pnpm typecheck`, CI and a fresh clone work without a database.

It lives in `shared/` rather than `app/` so server, app and test code all reach it through
the same `#shared/types/database.types` path.

### 8. One error envelope

Every failing route answers `{ code, messageKey, fieldErrors?, requestId }`. The client gets
a machine code and an **i18n key** — never a sentence, which is what lets one server response
render correctly in both languages, and never a SQL message or stack trace.

Internal detail goes to the log, correlated by `requestId`, which is also returned. A user
reporting "it said something went wrong" maps to exactly one log entry.

### 9. Validation defined once, enforced twice

Zod schemas in `shared/schemas/` run in the browser form **and** in the Nitro handler. The
server parse is authoritative; the client parse exists so the user sees errors without a
round trip. Critical constraints are additionally expressed as PostgreSQL CHECK constraints,
so a future write path — a script, a second client, a manual fix — cannot bypass them.

Note the subtlety recorded in `shared/schemas/profile.schema.ts`: Zod `.default()` values
survive `.partial()`, so a shared field definition carrying defaults would make an empty
PATCH body materialise `{ status: 'draft' }` and silently unpublish a live profile. Defaults
therefore belong to the create schema only.

### 10. Design tokens as CSS custom properties

Tailwind v4 has no config file. Tokens are `--pu-*` values in `app/assets/css/main.css`,
mapped through `@theme inline` onto semantic Tailwind names (`bg-surface`, `text-muted-fg`).

`inline` is what makes runtime re-theming work: generated utilities reference the `--pu-*`
variable directly, so a scope that redefines it (`.dark`, or a per-organization brand
override) re-themes the whole UI with no rebuild.

Current primary (`#192341`) and accent (`#e18146`) were read out of the supplied brand logo.
When the design system lands, only the `:root` block changes.

---

## Request lifecycles

### Public profile

```text
GET /en/mohammed-alqahtani
  → app/pages/[slug].vue
  → useFetch('/api/public/profiles/mohammed-alqahtani?locale=en')
      → validatedParams + validatedQuery                (Zod)
      → getPublicProfile()
          → serverSupabaseClient(event)                 (RLS applies)
          → findPublishedProfileBySlug()                 profiles ⋈ organizations ⋈ links
          → toPublicProfile()                            locale resolution +
                                                         internal fields stripped
      → Cache-Control: public, max-age=60, s-w-r=600
  → useSeoMeta: title, description, og:*, twitter:*, canonical
  → useSetI18nParams: slug for both locales → hreflang
  → ProfileView → Identity · Contact · Links · Wallet · QR · Company
```

A draft or nonexistent slug is a 404 in both cases. Reporting "exists but unpublished" would
leak the roster of upcoming profiles.

### vCard download

```text
GET /api/profiles/mohammed-alqahtani/vcard?locale=ar
  → getVCardSource()          one database read; both locales mapped from it
  → buildVCard()              pure function — vCard 3.0, CHARSET=UTF-8,
                              75-octet folding on codepoint boundaries
  → Content-Type: text/vcard; charset=utf-8
    Content-Disposition: attachment; filename="mohammed-alqahtani.vcf"
    X-Content-Type-Options: nosniff
```

### Administrator publishing a profile

```text
PATCH /api/admin/profiles/:id/status   { status: 'published' }
  → requireCapability(event, 'profiles:publish')     server-side authorization
  → validatedParams + validatedBody                 Zod
  → setProfileStatus()
      → getProfileForAdmin()                        loads the row, then
        assertCanManageOrganization()                verifies tenancy on the STORED row
      → serverSupabaseServiceRole().update()
      → trigger profiles_sync_published_at           the database owns published_at
  → the profile becomes visible to `anon` via RLS
```

Publishing is a separate endpoint with its own capability rather than part of the general
update, because it is the moment a profile becomes world-readable — a distinct, auditable act.

---

## Directory map

```text
app/                    Nuxt srcDir
  assets/css/main.css     Design tokens. The styling source of truth.
  assets/img/             Brand assets, imported (fingerprinted) by components
  components/app/         Design-system primitives
  components/profile/     Public profile domain
  components/admin/       Dashboard domain
  components/layout/      Chrome
  composables/            Reusable stateful logic
  layouts/                default · admin · auth
  middleware/             Navigation guards — never authorization
  pages/                  Routing and orchestration
  utils/                  Pure client helpers

server/
  api/public/             Anonymous reads
  api/profiles/           vCard, QR
  api/wallet/             Public add-to-wallet
  api/admin/              Authenticated dashboard endpoints
  middleware/             Request correlation id
  repositories/           SQL + row→DTO mapper
  services/               Business rules
  utils/                  auth · errors · logger · validation · urls

shared/                 #shared/* — imported by both sides
  constants/              Database enum mirrors, storage policy, roles
  schemas/                Zod — one definition, two runtimes
  types/                  DTO contracts + generated database types

supabase/migrations/    The only route to a schema change
i18n/locales/           en.json · ar.json
tests/                  unit · integration · component
docs/                   This file and its siblings
```

---

## Data model

```text
organizations ──1:1── organization_branding
     │
     ├──1:N── admin_users          (id → auth.users)
     │
     ├──1:N── integration_settings (provider, enabled, non-secret config)
     │
     └──1:N── profiles
                 │  slug (globally unique — the slug IS the public URL)
                 │  profile_type: individual | company
                 │  status: draft | published | inactive
                 │  *_en / *_ar text pairs
                 │  canonical contact channels
                 │
                 ├──1:N── profile_links   (type, label_en/ar, url, sort_order, enabled)
                 └──1:N── wallet_passes   (provider, external_id, status)
                              unique (profile_id, provider)
```

`profiles.slug` is globally unique because the public route (`/{locale}/{slug}`) has no
tenant segment. If the platform ever serves a second organization on its own hostname, relax
the index to `(organization_id, slug)` and add the host to routing.

`wallet_passes` is unique on `(profile_id, provider)` so the provider-side `external_id`
stays stable across regenerations — that id is what Apple and Google use to push updates to
passes already installed in someone's wallet. Losing it would orphan them.

---

## Testing strategy

| Project | Environment | Covers |
|---|---|---|
| `unit` | Node | Pure logic: vCard building, QR options, Zod schemas, the redirect allow-list, log redaction, storage key derivation |
| `integration` | Node, mocked boundaries | The public projection boundary — asserts the **exact** key set of `toPublicProfile`, so a newly leaked field fails the build |
| `component` | Nuxt runtime | Real Vue rendering of design-system primitives, including accessibility attributes |

Current: **104 tests**, all passing.

The integration test is the highest-value one: `toPublicProfile` is the last thing that runs
before data reaches an anonymous visitor, and adding a property to an object is always
type-valid — so only an exact-key assertion catches an accidental exposure.

Flows still to cover, once a test database is available in CI: login, create, edit, publish,
public visibility of a draft, vCard download.
