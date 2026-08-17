# Deployment

---

## Build output

A standard Nitro Node server. Any Node-capable host works.

```bash
pnpm install --frozen-lockfile
pnpm build                      # → .output/
node .output/server/index.mjs   # listens on PORT (default 3000)
```

`--frozen-lockfile` in CI so a deploy can never silently resolve a different dependency tree
than the one that was tested.

---

## Environments

| | Local | Staging (recommended) | Production |
|---|---|---|---|
| Host | `localhost:3000` | preview URL | `profile.pioneersunited.com` |
| Supabase | local Docker stack | separate Supabase project | production Supabase project |
| Seed data | `supabase/seed.sql` | none — real data only | none |
| `NUXT_PUBLIC_SITE_URL` | `http://localhost:3000` | the preview URL | `https://profile.pioneersunited.com` |

**Staging must be a separate Supabase project, not a schema in production.** RLS is per-role,
not per-schema, so sharing a project means staging credentials can reach production rows.

---

## Environment variables

Set in the platform, not in a file. `SUPABASE_SECRET_KEY` and every `NUXT_WALLET_*` value must
be stored as a **secret**, not plain text.

### Required

```env
NUXT_PUBLIC_SITE_URL=https://profile.pioneersunited.com
NUXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NUXT_PUBLIC_SUPABASE_KEY=<publishable / anon key>
SUPABASE_SECRET_KEY=<secret / service_role key>          # SECRET
```

### Optional

```env
NUXT_PUBLIC_DEFAULT_ORGANIZATION_SLUG=pioneers-united
NUXT_LOG_LEVEL=info
NUXT_WALLET_APPLE_*=…            # SECRET — see docs/wallet.md
NUXT_WALLET_GOOGLE_*=…           # SECRET — see docs/wallet.md
```

> **`NUXT_PUBLIC_SITE_URL` deserves special care.** QR codes and vCard `URL` properties are
> built from it. A wrong value produces QR codes pointing at the wrong host — and once those
> are printed on business cards, they cannot be reissued.

---

## Database

Migrations are applied **before** the application deploy, so the new code never meets an old
schema.

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <production-project-ref>
pnpm db:push          # apply migrations
```

`supabase/seed.sql` is **not** applied by `db:push` — it only runs on a local
`supabase db reset`. Production data is entered through the dashboard.

For zero-downtime schema changes, use the expand/contract sequence: add the new column →
backfill → deploy code that uses it → drop the old column in a later migration. Never combine
a destructive change with an application deploy.

---

## DNS and TLS

1. Create the subdomain `profile.pioneersunited.com`.
2. Point it at the deployment — a `CNAME` for most platforms; follow the host's instructions.
3. Confirm TLS is issued and HTTP redirects to HTTPS.

**HTTPS is required, not optional.** Session cookies are `Secure`, so authentication does not
work over plain HTTP. (`localhost` is exempt — browsers treat it as a trustworthy origin,
which is why local development works.)

The corporate site at `pioneersunited.com` is untouched. This is a separate deployment on a
separate subdomain.

---

## Supabase project configuration

Once per project — see the README for the click-path.

1. **Authentication → Providers → Email**: enabled, and **"Allow new users to sign up"
   disabled**. There is no public registration in this product.
2. **Authentication → URL Configuration**: Site URL and Redirect URLs set to the deployment
   origin.
3. **Administrators**: create the Auth user, then insert the matching `admin_users` row. The
   Auth user alone grants nothing — that row is what authorizes them.
4. **Storage**: confirm the three buckets exist and that `wallet-passes` is **private**.
5. **Password policy**: set a minimum length of at least 12 in project settings. The Zod
   schema asks for 12; Supabase is the authority.

---

## Pre-launch checklist

**Configuration**

- [ ] Every required environment variable set
- [ ] `NUXT_PUBLIC_SITE_URL` is the real production origin
- [ ] `SUPABASE_SECRET_KEY` stored as a secret, not plain text
- [ ] No secret behind a `NUXT_PUBLIC_` name
- [ ] `.env` not committed

**Database**

- [ ] Migrations applied (`pnpm db:push`)
- [ ] RLS enabled on every table; policies present
- [ ] `anon` verified: can read published profiles, cannot read drafts, cannot write
- [ ] Administrators created, each with an `admin_users` row
- [ ] No seed data in production

**Application**

- [ ] `pnpm verify` passes (lint, typecheck, test, build)
- [ ] `/` redirects to a locale; `/en` and `/ar` render
- [ ] A published profile renders in both locales; a draft returns 404
- [ ] vCard downloads and imports correctly on iOS **and** Android, with Arabic intact
- [ ] QR code scans to the correct production URL
- [ ] `/en/admin/login` reachable; unauthorized access redirects
- [ ] `X-Robots-Tag: noindex` present on `/en/admin/*` and `/ar/admin/*`
- [ ] `/robots.txt` served and correct
- [ ] Open Graph preview checked by pasting a profile link into WhatsApp and LinkedIn

**Security**

- [ ] HTTPS enforced; certificate valid
- [ ] No secret in any client bundle — search `.output/public` for key fragments
- [ ] Logs reviewed for accidental sensitive output

---

## Post-deploy verification

```bash
BASE=https://profile.pioneersunited.com

curl -I  $BASE/                                     # 302 → /en
curl -I  $BASE/en                                    # 200
curl -I  $BASE/ar                                    # 200
curl -sI $BASE/en/admin/login | grep -i x-robots-tag # noindex, nofollow, noarchive
curl -s  $BASE/api/public/wallet-status              # {"apple":false,"google":false}
curl -sI $BASE/en/<a-published-slug>                 # 200
curl -sI $BASE/en/<a-draft-slug>                     # 404
curl -s  $BASE/api/profiles/<slug>/vcard | head -5   # BEGIN:VCARD / VERSION:3.0
curl -sI $BASE/api/profiles/<slug>/qr                # image/svg+xml
curl -s  $BASE/en | grep -oE '<html[^>]*>'           # dir="ltr" lang="en-US"
curl -s  $BASE/ar | grep -oE '<html[^>]*>'           # dir="rtl" lang="ar-SA"
```

Then, by hand: scan the QR code with a phone, download the vCard on both iOS and Android and
confirm the Arabic name imports correctly, and paste a profile link into WhatsApp to check the
preview card.

---

## Rollback

The application and the database roll back differently.

**Application:** redeploy the previous build. Stateless, so this is safe and immediate.

**Database:** there is no automatic down-migration. Roll forward with a new migration that
reverses the change. This is why destructive changes use expand/contract — a dropped column
cannot be rolled back, only restored from a backup.

Before any destructive migration, take a backup: Supabase Dashboard → Database → Backups.

---

## Monitoring

Minimum viable:

- **Application logs** — structured JSON from `server/utils/logger.ts`, already redacted. Ship
  them wherever the platform collects logs.
- **`requestId`** — present on every log line and returned in error envelopes. This is the
  primary support tool: a user's "something went wrong" maps to one log entry.
- **Supabase Dashboard → Logs** — Postgres and PostgREST logs, useful for RLS denials.
- **Uptime check** on `GET /api/public/wallet-status`. It is cheap, needs no database, and a
  200 proves the Nitro server is alive.

Set `NUXT_LOG_LEVEL=info` in production. `debug` and `trace` are for investigation only —
they are noisy, not unsafe.
