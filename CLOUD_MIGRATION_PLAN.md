# Move to hosted Supabase + get a client-testable URL live

## Context

The database schema is already on the hosted Supabase project (ref `rolbihdglejddolhnzew`,
`https://rolbihdglejddolhnzew.supabase.co`) — all 7 migrations were applied via `pnpm db:push`
in a prior session (see `CLAUDE.md` "Current state and known gaps"). But the hosted schema has
**zero rows** (no organization, no admin, no profile), the local `.env` still points
`NUXT_PUBLIC_SUPABASE_URL` at `http://127.0.0.1:54321` (a local Docker stack that was never
started), and there is no Vercel project connected to this repo yet. So right now nothing is
actually reachable by a client: `pnpm dev` can't talk to a real database, and there is no
public URL at all.

`docs/deployment.md` already documents the exact "First deploy runbook" for this — the goal
here is to execute it, using the Supabase MCP server (read-only, per `.mcp.json`) for
verification and the Vercel MCP tools where they can substitute for manual dashboard clicks,
falling back to the dashboard for anything that genuinely requires it (creating the Auth user,
inserting data rows — `supabase/CLAUDE.md` is explicit that schema changes are migrations-only,
but data rows on a hosted project are dashboard-only, never MCP, never `seed.sql`).

Confirmed via read-only checks this session:
- Vercel account is connected (team `mohamedosamadesigner-gmailcoms-projects`), but has no
  project for this repo yet — only an unrelated `xperience-hotels` project exists.
- The repo's GitHub remote is `mrososs/pioneers-united-digital-profiles`.
- Local `.env` already has `sb_publishable_...` / `sb_secret_...` style keys set, but
  `NUXT_PUBLIC_SUPABASE_URL` still points at localhost — these need to be verified against the
  hosted project's actual current keys, not assumed correct.

## Steps

**1. Verify the hosted project's real state (Supabase MCP, read-only)**
- Authenticate the `supabase` MCP server (OAuth flow via `mcp__supabase__authenticate`).
- List tables/migrations to confirm all 7 migrations are applied and every table is empty,
  and pull the project's URL + anon/publishable key. The secret/service-role key is never
  returned by a read-only MCP call — get it from Dashboard → Project Settings → API keys.

**2. Point local `.env` at the hosted project**
- Edit `NUXT_PUBLIC_SUPABASE_URL` to `https://rolbihdglejddolhnzew.supabase.co`.
- Verify `NUXT_PUBLIC_SUPABASE_KEY` and `SUPABASE_SECRET_KEY` against the dashboard's current
  values (the ones already in `.env` may be stale — confirm, don't assume).
- Sanity check with `pnpm dev` locally against the real cloud data before touching Vercel.

**3. Seed real starter data on the hosted project (dashboard SQL editor — not a migration, not MCP)**
- Insert one `organizations` row (+ `organization_branding`) for Pioneers United using **real**
  company details (name, email, phone, address, website) — the user confirmed real data over
  placeholders. Modeled on `supabase/seed.sql`'s organization insert but with no `.test`
  fixtures. Ask for the specific contact details (and the first admin's real email) when
  executing this step.
- Authentication → Providers → Email: turn off "Allow new users to sign up".
- Authentication → Users: create the first real admin's Auth user; SQL editor: insert the
  matching `admin_users` row (`role = 'super_admin'`) referencing the organization above.
- From here on, use the dashboard UI itself (`/en/admin/login`, pointed at hosted data via
  step 2): fill in the company profile and publish at least one individual profile. No more
  raw SQL needed past this point.

**4. Get a public URL (Vercel)**
- Try `mcp__plugin_vercel_vercel__create_git_project` with `repo: "mrososs/pioneers-united-digital-profiles"`,
  `teamId: "team_TLlm3hQHSRajpe79lxO6aGHv"`. If the GitHub App isn't authorized for this
  private repo, it will fail — fall back to the manual dashboard import
  (`docs/deployment.md` → "First deploy runbook" step 3).
- Set env vars (Production **and** Preview) on the Vercel project: `NUXT_PUBLIC_SITE_URL`,
  `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY`, `SUPABASE_SECRET_KEY` (as a secret),
  `NUXT_PUBLIC_DEFAULT_ORGANIZATION_SLUG=pioneers-united`.
- `profile.pioneersunited.com` DNS isn't set up yet, so set `NUXT_PUBLIC_SITE_URL` to the
  Vercel-issued production URL for now — good enough for a client demo, and swappable to the
  real domain later without another deploy (just an env var change + redeploy).
- Deploy to **production** (not just a preview) — `NUXT_PUBLIC_SITE_URL` must be
  self-referential, which only production satisfies (see docs/deployment.md's note on preview
  URLs and QR codes).

**5. Point Supabase auth back at the deployment**
- Authentication → URL Configuration: set Site URL + Redirect URLs to the Vercel production
  URL, or `/en/admin/login` fails with a redirect error.

**6. Verify end-to-end**
- Run the `curl` checks from `docs/deployment.md` ("Post-deploy verification") against the
  production URL.
- Load the published profile(s) in a browser, confirm QR + vCard, confirm admin login works.
- Hand the client the production URL. Share the admin credentials separately/privately, not
  in the same channel as the public link.

## What this plan does not do

- Does not touch `supabase/migrations/` or run any schema-changing SQL — the schema is already
  correct on the hosted project.
- Does not wire up the real `profile.pioneersunited.com` domain — that's a separate DNS step
  the client/domain-owner does later; the Vercel URL is enough for testing.
- Does not implement Apple/Google Wallet — still blocked on credentials, unrelated to this task.
