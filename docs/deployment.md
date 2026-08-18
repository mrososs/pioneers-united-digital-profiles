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

## Continuous integration and deployment

### Who does what

```text
push / PR ──┬─► GitHub Actions (.github/workflows/ci.yml)
            │     lint · typecheck · test · build          ← the PR gate
            │
            └─► Vercel Git integration
                  pnpm install --frozen-lockfile && nuxt build
                  PR   → preview URL, commented on the pull request
                  main → production
```

Vercel owns the deploy. Actions does **not** deploy, so there are no Vercel tokens in
GitHub secrets and nothing to keep in sync.

The two run in parallel, which means **a failing CI run does not by itself stop a
preview from being published.** Actions still earns its place, because Vercel only ever
runs `nuxt build` and that misses two whole classes of failure:

| | Vercel build | `ci.yml` |
|---|---|---|
| Compile / bundle errors | yes | yes |
| **Type errors** | **no** — `typescript.typeCheck` is `false`, so `nuxt build` never type checks | yes |
| **Test failures** | **no** — Vercel does not run Vitest | yes |

To make CI an actual deploy gate, set **Project Settings → Git → Ignored Build Step** to a
command that exits `0` only when the CI status is green, or simply require the `verify`
check in a branch protection rule so nothing reaches `main` un-gated. The second is
usually enough: previews on a feature branch are allowed to be broken, production is not.

### Environment variables

Set these in **Project Settings → Environment Variables**, per environment. Vercel
injects them at build *and* runtime, which is what `runtimeConfig` needs.

| Variable | Production | Preview | Sensitive |
|---|---|---|---|
| `NUXT_PUBLIC_SITE_URL` | the production origin | the same production origin — see below | no |
| `NUXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | staging project | no |
| `NUXT_PUBLIC_SUPABASE_KEY` | publishable / anon key | staging key | no |
| `SUPABASE_SECRET_KEY` | secret / service_role key | staging key | **yes** |
| `NUXT_PUBLIC_DEFAULT_ORGANIZATION_SLUG` | `pioneers-united` | `pioneers-united` | no |
| `NUXT_LOG_LEVEL` | `info` | `debug` | no |

`NUXT_WALLET_*` stay unset until credentials arrive; the wallet endpoints answer
503 "not configured" rather than failing, so an unset value is the correct state.

> **Preview deployments cannot have a self-referential `NUXT_PUBLIC_SITE_URL`.**
> Every preview gets its own generated hostname, but `siteOrigin()` in
> `server/utils/urls.ts` reads the configured origin and deliberately never the request
> `Host` header — otherwise a forged header could rewrite the target of a QR code already
> printed on a business card. So on a preview, the page renders at the preview host while
> its QR code, vCard `URL` and `og:url` still point at the configured origin.
>
> This is working as intended, not a bug to route around. The consequence for
> demonstrations: **send the client the production URL, never a preview URL** — on a
> preview the page looks right but scanning the QR code takes you somewhere else.

### Region

`vercel.json` pins `fra1` (Frankfurt). It is the closest region to Saudi Arabia that
Vercel offers on every plan, and a public profile opened from a QR scan on mobile data is
the latency case that matters. Remove the key to fall back to the account default (`iad1`,
Washington) if the plan rejects it.

### Database migrations in CI

`.github/workflows/db-migrate.yml` applies `supabase/migrations/**` to a hosted project.
Manual dispatch only, defaulting to a dry run — a schema change is ordered *before* a
deploy and is mostly irreversible, so it must be a decision rather than a merge side
effect. It needs three repository secrets:

| Secret | Where from |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com/dashboard/account/tokens |
| `SUPABASE_PROJECT_REF` | Project Settings → General → Reference ID |
| `SUPABASE_DB_PASSWORD` | set when the project was created |

Gate it behind a GitHub Environment named `database` with required reviewers if a second
pair of eyes should sign off before production.

---

## First deploy runbook

In order. Steps 1–2 are the blocking ones — without a hosted database the site builds and
serves, but every profile route 500s or renders empty.

**1. Apply the schema to the hosted Supabase project**

The project exists — ref `rolbihdglejddolhnzew`, so the origin is
`https://rolbihdglejddolhnzew.supabase.co`. The ref is not a secret; it is the public
hostname. The keys are, and they live only in Vercel and a local `.env`.

The migrations have never run against it, so the schema is still empty. Either path works:

```bash
# From a terminal, once
pnpm exec supabase login
pnpm exec supabase link --project-ref rolbihdglejddolhnzew
pnpm exec supabase migration list --linked   # confirm all 7 are pending
pnpm db:push                                 # apply them
pnpm db:types:linked                         # regenerate types, then commit the result
```

Or run the **Database migrations** workflow from the Actions tab once the three
`SUPABASE_*` secrets are set, leaving `dry_run` checked for the first pass.

**2. Create the first administrator and some content**

`supabase/seed.sql` is local-only and never runs against a hosted project. So:
Authentication → Users → create the Auth user, then insert the matching `admin_users`
row. The Auth user by itself authorizes nothing — that row is what does. Then sign in at
`/en/admin/login` and publish at least one profile, or the demo has nothing to show.

Also disable **"Allow new users to sign up"** now. This product has no public
registration, and a hosted project has it on by default.

**3. Connect Vercel**

Import the GitHub repository. Framework, install command and region come from
`vercel.json`; set Node to 22.x to match CI. Add the environment variables above, then
redeploy — variables added after a build are not retroactive.

**4. Point Supabase back at the deployment**

Authentication → URL Configuration: set Site URL and Redirect URLs to the deployment
origin. Admin sign-in fails with a redirect error until this matches.

**5. Verify**

Work through the post-deploy `curl` checks below against the production URL, then scan a
QR code with a real phone and import a vCard on both iOS and Android.

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
