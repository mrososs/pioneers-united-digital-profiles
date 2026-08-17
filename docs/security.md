# Security

The threat model this platform is built against, and the specific control that answers each
concern.

---

## The starting assumption

**The publishable (anon) Supabase key ships in the browser bundle.** Anyone can extract it
and query the PostgREST API directly, bypassing every line of application code.

Everything below follows from that. Row Level Security — not the application — is the access
boundary. Server-side checks are always a *second* layer.

---

## Secrets

### What is secret

| Secret | Where it lives | Never |
|---|---|---|
| `SUPABASE_SECRET_KEY` (service role) | Server env, read via `useRuntimeConfig()` | In a `NUXT_PUBLIC_*` variable, a response, a log, the database, or a commit |
| Apple pass certificate (`.p12`) + password | Server env, base64 | Storage, the database, a log, a commit |
| Apple WWDR intermediate | Server env, base64 | as above |
| Google service-account private key | Server env | as above |

### How they are protected

- **Naming.** Only `NUXT_PUBLIC_*` variables reach the browser bundle. Everything else is
  server-only by construction — a secret cannot leak by accident of import, only by
  deliberately misnaming it.
- **`.gitignore`** blocks `.env`, `*.p12`, `*.pem`, `*.key`, `*.cer`,
  `*-service-account.json` and `secrets/`.
- **Log redaction.** `server/utils/logger.ts` strips credential-shaped **keys** at any depth
  and credential-shaped **values** (JWTs, `sb_secret_*`, PEM blocks) even under an innocent
  key name. A single `console.log(config)` is otherwise enough to persist a service-role key
  into a log aggregator, which then has to be treated as compromised.
- **Database-level refusal.** `integration_settings.config` has a trigger that rejects any key
  matching `secret|password|private|token|certificate|credential|api_key`, and the Zod schema
  rejects the same. That table is the one an operator might be tempted to paste a key into.
- **Presence-only status.** Wallet `status()` reports *whether* a credential exists, never a
  value, a length or a hash. The admin endpoint additionally returns the **names** of missing
  environment variables; the public endpoint returns booleans only.

### If a secret leaks

Rotate immediately — assume compromise from the moment of exposure.

1. Supabase Dashboard → Project Settings → API keys → rotate.
2. Update the deployment environment; redeploy.
3. Apple: revoke the Pass Type certificate in the Developer portal and issue a new one.
4. Google: delete the service-account key in Cloud Console and create a new one.
5. Review logs for use of the leaked credential.

---

## Row Level Security

Enabled on every table in `public`. Policies are in
`supabase/migrations/20260817000600_row_level_security.sql`.

| Caller | May do |
|---|---|
| `anon` | Read **published** profiles, their **enabled** links, and public organization/branding rows. **Nothing else. No writes, ever.** |
| `authenticated` without an `admin_users` row | Exactly what `anon` can. **Being signed in is not being an administrator.** |
| `admin` | Manage profiles and links within its own organization |
| `super_admin` | The above across all organizations, plus settings, branding, integrations, administrator management |

Design notes:

- **One policy per command**, not `FOR ALL`, so each grant is auditable in isolation.
- **`UPDATE` policies have both `USING` and `WITH CHECK`.** `USING` decides which rows may be
  updated; `WITH CHECK` prevents an update from moving a row into another organization.
- **Tenancy comes from a helper**, `can_manage_organization()`, not re-derived per policy.
- **Child visibility is inherited** — a `profile_links` row is public only when it is enabled
  *and* its parent profile is published.
- **Privileges are revoked as well.** `insert`, `update`, `delete` and `truncate` are revoked
  from `anon` on all tables in `public`. RLS filters rows a role may already touch; revoking
  the privilege is an independent barrier, so a policy mistake cannot become an anonymous
  write.
- `wallet_passes` and `integration_settings` have **no `anon` policy at all**.

### Verifying

```sql
set local role anon;
select count(*) from public.profiles;          -- published rows only
insert into public.profiles (…) values (…);    -- must fail
```

The seed includes a draft profile (`unpublished-example`) precisely so this is testable: it
must be invisible to `anon` and must 404 on the public route.

---

## Authorization

`server/utils/auth.ts` is the only module that decides whether a caller is an administrator.

1. **A row in `admin_users` with `is_active = true` is what grants access.** A Supabase Auth
   user without one has no dashboard privileges at all.
2. **The role is read from the database on every request, never from the JWT.**
   `raw_user_meta_data` is writable by the user through the Auth API, so a role claim there
   would be self-assigned. `app_metadata` is not user-writable but is still not the source of
   truth here — one source avoids the class of bug where two disagree after a role change.
3. **The client never makes an authorization decision.** `app/middleware/admin-auth.ts`
   decides what to *render*; every mutating route calls `requireAdmin`/`requireCapability`
   itself. Deleting the middleware would make the dashboard ugly, not insecure.
4. **Tenancy is verified against the stored row**, not the request body. An authenticated
   admin can send any `organizationId`, which is why `createProfile` calls
   `assertCanManageOrganization()` rather than trusting the payload.
5. **A failed lookup denies.** No fall-through to a default role.

Capabilities are declared in `shared/constants/roles.ts` and used for both the server check
and the UI's `can()`, so the two cannot describe different permissions.

---

## Input validation

- Zod schemas in `shared/schemas/` run in the browser form **and** in the Nitro handler.
- The server parse is authoritative. `server/utils/validation.ts` is the only entry point; a
  handler calling `readBody()` directly is a bug.
- Critical constraints are additionally PostgreSQL CHECK constraints, so a script, a second
  client or a manual fix cannot bypass them.
- Failures become a 422 with per-field **i18n keys**, never raw messages.

---

## XSS

- **No `v-html`.** ESLint enforces `vue/no-v-html`. All text goes through Vue's escaping
  interpolation.
- **URL protocol allow-list, three times over.** `http:` / `https:` (plus `mailto:` and
  `tel:` for links) is enforced in Zod (`optionalSafeUrlSchema`), in a PostgreSQL CHECK
  (`is_safe_link`), and again by the fact that stored values were validated on the way in. A
  `javascript:` URL cannot reach an `href`.
- **No SVG in `profile-media`.** An SVG is an executable document. `brand-assets` accepts it
  but only super admins may write there, and it is served from the Storage origin, not the
  app origin.
- **Colour values are re-validated** against a hex pattern before being interpolated into
  generated QR SVG markup, however they arrived.
- **Branding stores colours, not CSS.** Only validated hex values and asset keys, so a
  settings row cannot inject styles onto a public profile.

---

## Open redirects

`?redirect=` on the login page is the classic surface: an unvalidated value turns a real login
form on the real domain into a credential-phishing funnel.

`app/utils/redirect.ts` rejects everything except an unambiguously local dashboard path:

1. must start with a single `/` — blocks absolute URLs;
2. must not start with `//` or `/\` — blocks protocol-relative URLs;
3. must contain no `:` or `\` — blocks scheme smuggling;
4. must resolve, after an optional locale prefix, to a path under `/admin`;
5. must not be the login page itself.

`tests/unit/redirect.spec.ts` has a case per bypass technique.

---

## Error handling and information disclosure

- One envelope: `{ code, messageKey, fieldErrors?, requestId }`.
- **No SQL text, constraint names, stack traces or provider response bodies** ever reach a
  client. They go to the log, correlated by `requestId`, which is also returned so a user
  report maps to one log entry.
- **A draft profile and a nonexistent slug are indistinguishable** — both 404. Reporting
  "exists but unpublished" would leak the roster of upcoming profiles.
- **The login failure message is identical** for a wrong password and an unknown address, so
  the form cannot enumerate administrator e-mails.
- Provider errors are sanitised by `sanitiseProviderError()` before being persisted: a raw
  message can embed a request payload including a token.

---

## Admin API surface

- Every `/api/admin/**` handler authorizes first, before parsing.
- Every response is `Cache-Control: no-store` — a shared cache holding one administrator's
  data would serve it to another.
- `X-Robots-Tag: noindex, nofollow, noarchive` on `/en/admin/**` and `/ar/admin/**` via
  `routeRules`, plus `noindex` meta tags and `Disallow` in `robots.txt`. Three layers because
  `robots.txt` is a request, not an enforcement.
- No public sign-up. Administrators are provisioned deliberately (see the README).

---

## Sessions

- Supabase Auth email/password, session in an HttpOnly cookie via `@supabase/ssr`.
- `sameSite: 'lax'`, `secure: true`, `maxAge` 8 hours.
- `secure: true` means **HTTPS is required in production**. `localhost` is treated as a
  trustworthy origin by browsers, so development works.
- Sign-out clears the Supabase session **and** resets the cached session state — otherwise the
  next render could briefly show the previous user's navigation.

The architecture supports adding SSO later: authentication is entirely Supabase's concern and
authorization reads only `admin_users`, so a new provider changes the login screen and
nothing else.

---

## Checklist for new code

- [ ] Every external input validated with a shared Zod schema
- [ ] `requireAdmin` / `requireCapability` on every `/api/admin/**` handler
- [ ] Tenancy re-checked against the stored row, not the request body
- [ ] Service-role client used only after authorization is proven
- [ ] New table has RLS enabled and explicit policies in the same migration
- [ ] `anon` cannot read unpublished data and cannot write at all
- [ ] No secret in a response, a log, or anything reaching the client
- [ ] Errors go through `apiError` / `fromPostgrestError`
- [ ] `no-store` on anything per-user
- [ ] Redirect targets validated against the allow-list
- [ ] Any new URL-bearing field protocol-checked in both Zod and a CHECK constraint
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
