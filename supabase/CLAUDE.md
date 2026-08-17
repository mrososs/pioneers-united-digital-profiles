# supabase/CLAUDE.md — database rules

Rules for everything under `supabase/`. The root `CLAUDE.md` has the project-wide rules;
read both.

---

## The critical rule

**Every schema change is a migration in `supabase/migrations/`. Without exception.**

No manual edits in the Supabase dashboard's table or SQL editor against a shared or
production database. A change made there exists nowhere in version control, is invisible to
every other environment, and will be silently reverted the next time someone runs
`supabase db reset` or diffed away by `supabase db push`.

If a change has already been made by hand, capture it before doing anything else:

```bash
pnpm exec supabase db diff -f describe_what_changed   # writes a migration from the drift
```

**And whenever a migration changes the schema, regenerate the TypeScript types and commit
them in the same change:**

```bash
pnpm db:types        # from the local stack
pnpm db:types:linked # from the linked project
```

A migration without regenerated types leaves `shared/types/database.types.ts` lying about
the database, and `pnpm typecheck` will keep passing while the code is wrong.

---

## Local development

Requires Docker Desktop running.

```bash
pnpm db:start    # start Postgres, Auth, Storage, Studio
pnpm db:status   # print local URLs and keys — copy into .env
pnpm db:reset    # DESTRUCTIVE (local only): re-run all migrations, then seed.sql
pnpm db:stop     # stop the stack
```

`pnpm db:reset` is the fastest way to confirm migrations apply cleanly from an empty
database — the thing that matters most and the thing production will do.

---

## Migrations

### Creating one

```bash
pnpm exec supabase migration new add_profile_view_counter
```

This produces `supabase/migrations/<timestamp>_add_profile_view_counter.sql`. Never rename
or reorder an existing file: the timestamp is the applied order, and a migration that has
run anywhere is immutable. Fix a mistake with a new migration.

### Writing one

- **Idempotent where it costs nothing**: `create extension if not exists`,
  `create or replace function`, `on conflict do nothing` for reference data.
- **Comment the *why*.** Every existing migration opens with a header explaining the
  decisions it encodes. Match that. The next reader needs to know why `profile_links` is a
  table and not more columns.
- **Never destructive without a plan.** Dropping or renaming a column deletes data.
  Prefer: add the new column → backfill → switch the code → drop in a later migration.
- **One concern per migration.** Easier to read, easier to reason about when one fails.
- `comment on table` / `comment on column` for anything non-obvious. Those comments end up
  in the generated types and in Studio.

### Current migrations, in order

| File | Contains |
|---|---|
| `…000100_init_enums_and_helpers` | Enums (mirrors of `shared/constants/`), `set_updated_at()`, immutable validation functions used by CHECK constraints |
| `…000200_organizations` | `organizations`, `organization_branding` |
| `…000300_admin_users` | `admin_users` + the SECURITY DEFINER authorization helpers |
| `…000400_profiles` | `profiles`, `profile_links`, `published_at` trigger |
| `…000500_wallet_and_integrations` | `wallet_passes`, `integration_settings` + secret-rejection trigger |
| `…000600_row_level_security` | RLS enabled and every policy, plus privilege revocations |
| `…000700_storage` | Buckets and `storage.objects` policies |

Order matters: the authorization helpers must exist before the policies that call them.

---

## Schema conventions

- `snake_case` everywhere. Mapping to camelCase happens once, in
  `server/repositories/profile.mapper.ts`.
- Primary keys: `uuid` with `default gen_random_uuid()`.
- Timestamps: `timestamptz not null default now()` for `created_at` and `updated_at`, plus a
  `set_updated_at` BEFORE UPDATE trigger. Never trust a client-sent timestamp.
- Bilingual text is a **column pair** `*_en` / `*_ar`, not a translations table. There are
  exactly two locales, names are mandatory in both, and every read needs both (hreflang,
  the switcher, the vCard). Revisit only if a third locale is added.
- Enums for closed sets that the application branches on. **Every enum has a mirror in
  `shared/constants/`** — change both together.
- `text` with a CHECK for sets that may plausibly grow (`integration_settings.provider`), so
  adding a value is not an enum migration plus a type regeneration.
- Foreign keys always specify `on delete`: `cascade` for owned rows, `restrict` where
  deletion should be blocked, `set null` for audit references like `created_by`.

### Constraints

Validate at the database level as well as in Zod. Two independent layers means a future
write path — a script, a second client, a manual fix — cannot bypass the rule.

The reusable predicates in migration `000100` are `immutable` so they can be used in CHECK
constraints: `is_valid_slug`, `is_valid_e164`, `is_valid_email`, `is_safe_link`,
`is_valid_storage_path`, `is_valid_hex_color`. Reuse them; do not inline a new regex.

`is_safe_link` in particular is what stops a `javascript:` URL from reaching an `href`,
independently of the application.

### Indexes

Add one when a query needs it, not speculatively. Every index costs write throughput.

Current set and its justification:

| Index | Serves |
|---|---|
| `profiles_slug_key` (unique) | The slug **is** the public URL, so it must be globally unique |
| `profiles_published_slug_idx` (partial) | The public profile lookup — one row by slug, published only |
| `profiles_organization_status_idx` | The admin list, filtered by tenant and status |
| `profiles_updated_at_idx` | The admin list's default sort |
| `profiles_published_at_idx` (partial) | Public listings by publication date |
| `profiles_organization_type_idx` | Finding the company profile |
| `profile_links_profile_id_sort_idx` | Rendering a profile's links in order |
| `wallet_passes_profile_provider_key` (unique) | One pass per profile per provider, keeping `external_id` stable |

Admin search is a plain `ILIKE` — a sequential scan over a roster of executives is cheaper
than maintaining a trigram index. If the table reaches thousands of rows, add `pg_trgm` GIN
indexes and change `listProfiles` in the repository; nothing else needs to move.

---

## Row Level Security

**Every table in `public` has RLS enabled. A new table without policies is a security bug**,
because Supabase's PostgREST exposes it to anyone holding the publishable key — which ships
in the browser bundle.

### The invariants

| Caller | May do |
|---|---|
| `anon` | Read **published** profiles, their **enabled** links, and public organization/branding rows. **Nothing else. No writes, ever.** |
| `authenticated` without an `admin_users` row | Exactly what `anon` can. Being signed in is not being an administrator. |
| `admin` | Manage profiles and links **within its own organization**. |
| `super_admin` | The above across all organizations, plus organization settings, branding, integrations and administrator management. |

Additionally, `anon` has `insert`, `update`, `delete` and `truncate` **revoked** on all
tables in `public`. RLS filters rows a role may already touch; revoking the privilege is a
second, independent barrier so a policy mistake cannot become an anonymous write.

### Writing policies

- **One policy per command**, not `FOR ALL`, so each grant is auditable in isolation.
- Name them `"table: what it allows"` — the name appears in `pg_policies` and in errors.
- Scope with `TO anon` / `TO authenticated` explicitly.
- `UPDATE` needs **both** `USING` and `WITH CHECK`. `USING` decides which rows may be
  updated; `WITH CHECK` stops the update from moving a row into another organization.
- Use the helpers, do not re-derive tenancy:

  ```sql
  public.is_active_admin()                    -- has an active admin_users row
  public.is_super_admin()                     -- role = 'super_admin'
  public.current_organization_id()             -- caller's organization
  public.can_manage_organization(org_id uuid)  -- super admin, or admin of that organization
  ```

  They are `SECURITY DEFINER` deliberately: they must read `admin_users` while bypassing its
  own policies, or every policy that calls them would recurse. All are `stable` with
  `set search_path = ''`.

- Child tables inherit visibility from their parent via `EXISTS` — a link is public only
  when it is enabled **and** its profile is published.

### Verifying a policy

Do not assume. Check as each role:

```sql
set local role anon;
select count(*) from public.profiles;                 -- published only
insert into public.profiles (…) values (…);           -- must fail

set local role authenticated;
set local request.jwt.claims to '{"sub":"<uuid>"}';
select count(*) from public.profiles;
```

The seed data includes a `draft` profile (`unpublished-example`) specifically so this is
testable: it must be invisible to `anon` and must 404 on the public route.

---

## Storage

Buckets are created and configured in migration `000700`, not by hand, so the strategy is
reproducible. See `docs/storage.md` for the full rationale.

| Bucket | Visibility | Contents |
|---|---|---|
| `profile-media` | public | Profile photographs |
| `brand-assets` | public | Logos, favicons, social images |
| `wallet-passes` | **private** | Generated `.pkpass` bundles and pass artwork |

- Bucket-level `allowed_mime_types` and `file_size_limit` mirror
  `shared/constants/storage.ts` and are enforced by Storage itself, independently of the
  application. **Change both together.**
- No SVG in `profile-media` — an SVG is an executable document.
- `brand-assets` accepts SVG but only super admins may write it.
- `wallet-passes` has no `anon` policy and no `authenticated` write policy: writes happen
  only through Nitro with the secret key. A pass embeds one person's contact details.
- The database stores an **object key**, never a full URL. URLs are derived at read time so
  the storage origin (or a CDN in front of it) can change without a migration.
- **No credential ever goes in Storage.** Certificates and service accounts are environment
  variables.

---

## Seed data

`supabase/seed.sql` runs on `supabase db reset` — **local only**. It is not executed by
`supabase db push`, so it cannot reach a linked project by accident.

Rules:

- **Everything is obviously fake.** Names say "development data", e-mail addresses use the
  reserved `.test` TLD, phone numbers are in reserved ranges.
- **Never add a real executive's details.** Real profiles are entered through the dashboard
  against a real database. Personal data in a committed file is a data-protection problem,
  not a convenience.
- Fixed UUIDs so seeded rows are stable across resets and referenceable in tests.
- The seeded administrator (`dev-admin@example.test` / `LocalDevOnly!2026`) is public
  knowledge by definition. It exists so `pnpm db:reset && pnpm dev` yields a working login
  in one step. It must never be reused anywhere reachable from the internet.

---

## Type generation

`shared/types/database.types.ts` is generated and committed.

- Committed so `pnpm typecheck`, CI and a fresh clone work without a database.
- It is in the ESLint ignore list — do not hand-edit it, and do not reformat it.
- `@nuxtjs/supabase` reads it via `supabase.types` in `nuxt.config.ts`, which is what makes
  `useSupabaseClient()` and `serverSupabaseClient()` typed with no generic.
- If the generator and the committed file disagree, **the generator wins**. Re-run it and
  commit the result.

---

## Before finishing database work

```bash
pnpm db:reset      # migrations apply cleanly from empty, seed succeeds
pnpm db:types      # types regenerated
pnpm typecheck     # the application still compiles against the new schema
pnpm test
```

Then confirm by hand:

- [ ] RLS enabled on every new table
- [ ] A policy per command, per role, with `WITH CHECK` on updates
- [ ] `anon` cannot read unpublished data and cannot write at all
- [ ] Indexes justified by an actual query
- [ ] Enum changes mirrored in `shared/constants/`
- [ ] `shared/types/database.types.ts` regenerated and committed
