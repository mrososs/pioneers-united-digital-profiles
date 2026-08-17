# server/CLAUDE.md — server rules

Rules for everything under `server/`. This is the only place in the repository where
secrets exist and the only place where authorization decisions are made. The root
`CLAUDE.md` has the project-wide rules; read both.

---

## The one thing to understand first

**The publishable (anon) Supabase key ships in the browser bundle.** Anyone can extract it
and query the PostgREST API directly, bypassing this entire codebase.

Therefore:

- Row Level Security — not the application — is the real access-control boundary.
- Nitro's job is to add what RLS cannot express: input validation, derived object keys,
  locale resolution, the public/private field split, and secret-holding integrations.
- Every server-side check is a **second** layer, never the only one.

---

## Layering

```text
server/api/          transport  — parse, authorize, set headers, return
server/services/     rules      — business logic, orchestration, DTO shaping
server/repositories/ data       — SQL only, no rules, no HTTP
server/utils/        primitives — auth, errors, logger, validation, urls
```

A handler that reaches straight into a repository skips the rules layer; a repository that
imports from `utils/errors` has taken on a transport concern. Keep the direction of
dependency pointing downward only.

**Imports inside `server/` are relative** (`../../services/profile.service`). Only
`server/utils/` is auto-imported by Nitro; `services/` and `repositories/` are not, and
adding them to the auto-import config would hide where behaviour comes from. `#shared/*`
and `#supabase/server` are the two aliases in use.

---

## API conventions

### File naming

Nitro derives the route and method from the filename:

```text
server/api/public/profiles/[slug].get.ts        GET  /api/public/profiles/:slug
server/api/admin/profiles/index.post.ts         POST /api/admin/profiles
server/api/admin/profiles/[id].patch.ts         PATCH /api/admin/profiles/:id
server/api/admin/profiles/[id]/status.patch.ts  PATCH /api/admin/profiles/:id/status
```

Always suffix the method. A handler without one answers every verb, which is how a `GET`
ends up mutating state.

### Namespaces

| Prefix | Audience | Requirement |
|---|---|---|
| `/api/public/**` | Anonymous | Published data only. Cacheable. |
| `/api/profiles/:slug/**` | Anonymous | vCard and QR for **published** profiles. |
| `/api/wallet/:provider/:slug` | Anonymous | Pass generation for published profiles. |
| `/api/admin/**` | Authenticated administrators | `requireAdmin` / `requireCapability` in **every** handler. |

### Handler shape

```ts
export default defineEventHandler(async (event) => {
  const session = await requireCapability(event, 'profiles:write')   // 1. authorize
  const { id } = validatedParams(event, profileIdParamSchema)        // 2. validate
  const input = await validatedBody(event, profileUpdateSchema)      // 3. validate
  return updateProfileForAdmin(event, session, id, input)            // 4. delegate
})
```

Authorize first, validate second, delegate third. A handler with business logic inline is
a handler whose logic cannot be reused or tested.

### Cache headers

State them explicitly; the default is wrong for at least one of the two cases.

- Public, identical for everyone → `public, max-age=..., stale-while-revalidate=...`
- Anything per-user or administrative → `no-store`

`/api/admin/**` is always `no-store`. Getting this wrong puts one administrator's data in
another's cache.

---

## Validation

**Every** external input goes through `server/utils/validation.ts`:

```ts
validatedParams(event, schema)   // route parameters
validatedQuery(event, schema)    // query string
await validatedBody(event, schema)  // JSON body
```

- Schemas come from `shared/schemas/`, the same objects the client forms use. Do not define
  a server-only variant of a rule that already exists.
- A handler that calls `readBody()`, `getQuery()` or `getRouterParams()` directly is a bug.
- Failures become a 422 with per-field i18n keys automatically.
- Multipart uploads cannot use these helpers; `api/admin/media/upload.post.ts` validates
  the parts by hand and is the reference for how (magic-byte check, derived key, size cap).

**Never trust a value just because it arrived from an authenticated caller.** An admin can
send any `organizationId`; that is why `createProfile` calls
`assertCanManageOrganization()` rather than using the one in the body.

---

## Supabase access

Two clients. Choosing between them is a security decision, so make it deliberately.

```ts
await serverSupabaseClient(event)   // acts AS THE CALLER — RLS applies
serverSupabaseServiceRole(event)    // BYPASSES RLS — full database access
```

**Use `serverSupabaseClient` for every public read.** The anonymous visitor's own
privileges then decide what comes back, which means the real read path exercises RLS. If
the "published only" policy ever regressed, the public route would break loudly instead of
over-sharing quietly. `getPublicProfile()` works this way on purpose.

**Use `serverSupabaseServiceRole` only after proving authorization**, and re-check tenancy
inside the service. Both halves are required: `requireAdmin` proves *who*,
`assertCanManageOrganization` proves *which rows*.

Repositories take the client as an argument specifically so the privilege level is visible
at the call site rather than buried in a module.

---

## Authorization

`server/utils/auth.ts` is the only module that decides whether a caller is an administrator.

```ts
await requireAdmin(event)                              // any active administrator
await requireCapability(event, 'profiles:publish')      // a specific capability
assertCanManageOrganization(event, session, orgId)      // tenancy on a named record
```

Rules:

1. **Being authenticated is not being an administrator.** Only an active row in
   `public.admin_users` grants dashboard access.
2. **The role is read from the database on every request.** Never from the JWT.
   `raw_user_meta_data` is writable by the user through the Auth API, so a role claim there
   would be self-assigned. `app_metadata` is not user-writable but is still not the source
   of truth here — one source avoids the class of bug where two disagree.
3. **`app/middleware/admin-auth.ts` is not security.** It runs on the client for
   client-side navigations and only decides what to render. Deleting it would make the
   dashboard ugly, not insecure.
4. Capabilities come from `shared/constants/roles.ts`. Add a capability there, gate the
   route with it, and use the same string in the UI's `can()` check.

401 vs 403 matters: anonymous gets 401 (sign in), authenticated-but-unauthorized gets 403
(do not retry). `requireAdmin` distinguishes them.

---

## Error handling

All errors go through `server/utils/errors.ts`.

```ts
throw apiError({ code: 'conflict', messageKey: 'validation.slugTaken', event, internal: error })
throw notFound(event)
throw forbidden(event)
throw notConfigured(missingEnvVarNames, event)
throw fromPostgrestError(error, event)   // in a catch around repository calls
```

The client receives only `{ code, messageKey, fieldErrors?, requestId }`.

**Never leak internals.** No SQL text, no constraint names, no stack traces, no provider
response bodies. They go to the log via `internal:`, correlated by `requestId`, which is
also returned to the client so a user report maps to one log entry.

`fromPostgrestError` maps Postgres codes to meaningful statuses — a unique violation on
`profiles_slug_key` is a 409 the user can fix, not a 500. Wrap every repository call in a
`try`/`catch` that calls it.

**A failed authorization lookup must deny.** Never fall through to a default role — see
the error branch in `getAdminSession`.

---

## Logging

Use `server/utils/logger.ts`. Never bare `console`.

```ts
requestLogger(event).error('wallet_pass_generation_failed', { provider, slug, detail: error })
```

Every value passes through the redactor first, which strips credential-shaped **keys** at
any depth and credential-shaped **values** (JWTs, `sb_secret_*`, PEM blocks) even under an
innocent key name.

**Never log:** passwords, access or refresh tokens, JWTs, the Supabase secret key, Apple
certificates or their password, Google service-account private keys, raw login request
bodies.

Safe to log: request ids, route paths, user ids, profile ids, error codes, and the **names**
of missing environment variables.

Messages are `snake_case` event names, not sentences — they are grepped, not read as prose.

---

## Wallet integrations

`server/services/wallet/` — provider-specific code stays isolated behind
`WalletProviderAdapter`.

```text
types.ts                  the contract + config shapes
wallet.service.ts         registry, config injection, status, error sanitisation
apple-wallet.service.ts   Apple adapter  — NOT IMPLEMENTED
google-wallet.service.ts  Google adapter — NOT IMPLEMENTED
```

Rules:

- **Nothing outside this folder imports a provider module.** Call `walletAdapter(provider)`.
  Adding a third provider is one new adapter plus one switch arm.
- **Check `status().configured` before generating.** While credentials are absent the route
  answers 503 `not_configured`; it never throws an unhandled provider error.
- **Credentials come from `useRuntimeConfig().wallet`**, injected into adapters as getters
  so the adapters stay unit-testable and the set of secrets each can reach is explicit.
- **`status()` exposes presence only** — never a value, a length or a hash. The admin
  endpoint returns the names of missing environment variables; the public endpoint returns
  booleans only, because enumerating configuration to the world is free reconnaissance.
- **Sanitise provider errors before persisting** with `sanitiseProviderError()`. A raw
  provider message can embed a request payload including a token.
- Providers never query the database. They receive a `WalletPassContext` built by the
  caller, so they cannot accidentally read an unpublished profile.
- Certificates and private keys: environment variables only. Never the database, never
  Storage, never a log, never a commit.

---

## vCard generation

`server/services/vcard/vcard.service.ts` — a pure function of its input. No h3, no
Supabase, no runtime config, which is what makes it unit-testable.

- **vCard 3.0**, chosen for client compatibility over specification quality.
- `CHARSET=UTF-8` on text properties — this is what makes Arabic survive import.
- CRLF line endings; folding at **75 octets** on codepoint boundaries. A character-based
  fold splits Arabic mid-codepoint and produces mojibake.
- Escape `\`, `;`, `,` and newlines.
- One card per locale (`?locale=ar`); the alternate-language name goes in `NOTE`.
- Headers: `text/vcard; charset=utf-8`, `Content-Disposition: attachment`,
  `X-Content-Type-Options: nosniff`.

---

## QR generation

`server/services/qr/qr.service.ts`.

- **The payload is always the canonical profile URL from the service.** Never a value from
  the query string — that would make this an open QR generator rendering attacker-chosen
  destinations under the company's domain.
- Nothing is persisted. A QR is a pure function of the URL; storing it creates a second
  source of truth that goes stale when a slug changes.
- Colours from a query string or branding settings are re-validated against a hex pattern
  before reaching generated SVG markup.
- Sizes are clamped, so a query string cannot request a 100-megapixel PNG.

---

## Storage uploads

`server/api/admin/media/upload.post.ts` is the only write path into Storage.

- **The object key is derived server-side**, never supplied by the client. A
  client-controlled key gives path traversal and overwrites of other profiles' media.
- **The declared MIME type is checked against the payload's magic bytes.** An SVG renamed
  to `.png` with `Content-Type: image/png` passes a header check and then executes when
  served.
- SVG is accepted in `brand-assets` only, and only from a super admin, because an SVG is an
  executable document.
- Size caps are enforced before writing, and again by the bucket definition.
- `upsert: false` — keys are unique per upload, so a collision means a bug, not a replace.

---

## Security checklist for new server code

- [ ] Every input validated with a shared Zod schema
- [ ] `requireAdmin` / `requireCapability` on every `/api/admin/**` handler
- [ ] Tenancy re-checked against the stored row, not the request body
- [ ] Service-role client used only after authorization is proven
- [ ] No secret in a response, a log, or anything reaching the client
- [ ] Errors go through `apiError` / `fromPostgrestError` — no internals leaked
- [ ] Cache headers set deliberately; `no-store` on anything per-user
- [ ] Redirect targets validated against an allow-list (no open redirect)
- [ ] New table? RLS enabled and policies written in the same migration
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
