# Wallet integrations

**Status: not implemented. Awaiting credentials from the client.**

The service boundaries, status reporting, bookkeeping table and UI handling are complete. What
is missing is the signing material, which cannot be invented — and the code deliberately
refuses rather than pretending.

---

## Current behaviour

| Surface | With no credentials |
|---|---|
| `GET /api/wallet/apple/:slug` | `503` with `{ code: 'not_configured' }` |
| `GET /api/wallet/google/:slug` | `503` with `{ code: 'not_configured' }` |
| `POST /api/admin/wallet/generate` | `503` with `{ code: 'not_configured' }` |
| `GET /api/public/wallet-status` | `{ "apple": false, "google": false }` |
| Public profile wallet section | Buttons hidden; an explanatory notice is shown |
| `/en/admin/wallet` | Each provider marked "Not configured", listing the missing environment variable **names** |

Nothing throws an unhandled error and nothing is half-generated. Adding the credentials
flips every one of these without a code change — `status()` starts returning `configured:
true`, and only the two `generate()` implementations remain.

---

## Architecture

```text
server/services/wallet/
  types.ts                    WalletProviderAdapter, WalletPassContext, config shapes
  wallet.service.ts           registry, config injection, status summary, error sanitisation
  apple-wallet.service.ts     Apple adapter   — generate() not implemented
  google-wallet.service.ts    Google adapter  — generate() not implemented
```

```ts
interface WalletProviderAdapter {
  readonly provider: WalletProvider
  status(): WalletProviderStatus                                  // is it usable?
  generate(context: WalletPassContext): Promise<WalletPassArtifact>
}
```

Rules that keep this replaceable:

- **Nothing outside the folder imports a provider module.** Callers use
  `walletAdapter(provider)`. Adding a third provider is one new adapter plus one switch arm.
- **Providers never query the database.** They receive a `WalletPassContext` built by the
  caller — already locale-resolved — so a provider cannot accidentally read an unpublished
  profile.
- **Config is injected as getters**, not read from `useRuntimeConfig()` inside the adapter, so
  adapters are unit-testable without a Nitro context and the set of secrets each can reach is
  explicit and auditable.
- **The artifact type is a discriminated union**, because Apple returns bytes and Google
  returns a URL:

  ```ts
  | { kind: 'file'; provider: 'apple';  fileName; mimeType; body: Uint8Array; externalId }
  | { kind: 'link'; provider: 'google'; url: string;                          externalId }
  ```

  The two cannot be confused at a call site.

---

## Apple Wallet

### Credentials required

| Environment variable | Where it comes from |
|---|---|
| `NUXT_WALLET_APPLE_TEAM_IDENTIFIER` | Apple Developer account → Membership (e.g. `A1B2C3D4E5`) |
| `NUXT_WALLET_APPLE_PASS_TYPE_IDENTIFIER` | Certificates, Identifiers & Profiles → Identifiers → **Pass Type IDs** (e.g. `pass.com.pioneersunited.profile`) |
| `NUXT_WALLET_APPLE_CERTIFICATE_BASE64` | The Pass Type ID certificate exported as `.p12`, base64-encoded |
| `NUXT_WALLET_APPLE_CERTIFICATE_PASSWORD` | The password set when exporting the `.p12` |
| `NUXT_WALLET_APPLE_WWDR_CERTIFICATE_BASE64` | Apple Worldwide Developer Relations intermediate certificate (`.cer`), base64-encoded |

Requires a **paid Apple Developer Program membership** (~USD 99/year).

### How to obtain them

1. Apple Developer portal → Certificates, Identifiers & Profiles → Identifiers → **+** →
   **Pass Type IDs**. Create `pass.com.pioneersunited.profile`.
2. Select it → **Create Certificate**. Generate a Certificate Signing Request in Keychain
   Access (Certificate Assistant → Request a Certificate From a Certificate Authority),
   upload it, download the resulting `.cer`.
3. Import the `.cer` into Keychain Access, then export the certificate **with its private
   key** as `.p12`, setting a password.
4. Download the WWDR intermediate certificate from Apple's certificate authority page.
5. Base64-encode both:
   ```bash
   base64 -i pass-certificate.p12 | tr -d '\n'
   base64 -i AppleWWDRCAG4.cer     | tr -d '\n'
   ```
6. Set them in the deployment environment as **secrets**. Never commit the files —
   `.gitignore` blocks `*.p12`, `*.cer`, `*.pem`, `*.key`.

### What implementing it involves

All inside `apple-wallet.service.ts`:

1. **Build the bundle in memory:**
   - `pass.json` — a `generic` pass with `primaryFields` (name), `secondaryFields` (job
     title, organization), a `barcode` of format `PKBarcodeFormatQR` whose `message` is
     `context.profileUrl`, and the brand colours from `context.brand`.
   - `icon.png`, `icon@2x.png`, `logo.png`, `logo@2x.png` (and optionally `strip*`), fetched
     from the `brand-assets` bucket.
   - `manifest.json` — SHA-1 of every file in the bundle.
   - `signature` — PKCS#7 **detached** signature of `manifest.json`, made with the Pass Type
     certificate and chained to the WWDR intermediate.
2. **ZIP it** and return `{ kind: 'file', mimeType: 'application/vnd.apple.pkpass', … }`.
3. **Keep `serialNumber` equal to the previous `external_id` on regeneration.** Apple
   identifies an installed pass by `(passTypeIdentifier, serialNumber)`; changing it creates a
   second pass in the recipient's wallet instead of updating the one they have. This is why
   `wallet_passes` is unique on `(profile_id, provider)`.
4. **Live updates (optional, later):** add `webServiceURL` and `authenticationToken` to
   `pass.json` and implement the four device-registration routes Apple requires. Separate
   piece of work, deliberately out of scope.

A signing library (`node-forge`, or a dedicated pass builder) will be needed — the certificate
handling and the detached PKCS#7 signature are not worth hand-rolling.

### Constraints that must hold

- Signing happens **server-side only**. There is no code path where the browser receives
  signing material; it receives only the finished `.pkpass` bytes.
- The `.p12` and its password exist only as environment variables. Never in the database, never
  in Storage, never in a log.

---

## Google Wallet

### Credentials required

| Environment variable | Where it comes from |
|---|---|
| `NUXT_WALLET_GOOGLE_ISSUER_ID` | Google Pay & Wallet Console → your issuer account |
| `NUXT_WALLET_GOOGLE_CLASS_SUFFIX` | Chosen by you (e.g. `pioneers_united_profile`) |
| `NUXT_WALLET_GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google Cloud service account |
| `NUXT_WALLET_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | That service account's JSON key, `private_key` field |

Free, but requires issuer approval, which can take several business days.

### How to obtain them

1. Request an issuer account at the **Google Pay & Wallet Console** and wait for approval.
2. Google Cloud Console → enable the **Google Wallet API** for the project.
3. Create a **service account**; create a JSON key for it.
4. In the Wallet Console → Users, grant that service-account e-mail the **Wallet Object
   Issuer** role. Without this, authenticated calls still fail.
5. Take `client_email` and `private_key` from the JSON. Keep the literal `\n` escapes in
   `private_key` on one line when setting the environment variable.
6. Set them as **secrets**. Never commit the JSON — `.gitignore` blocks
   `*-service-account.json`.

### What implementing it involves

All inside `google-wallet.service.ts`:

1. **Generic Pass class** — created once per deployment, not per profile. It is the template:
   which fields exist, the logo, the hero image, the colour. `POST`/`PUT`
   `https://walletobjects.googleapis.com/walletobjects/v1/genericClass` with id
   `{issuerId}.{classSuffix}`. Idempotent, so it is safe to ensure on first use.
2. **Generic Pass object** — one per profile, id `{issuerId}.{profileId}`, holding the values
   (name, job title, organization) and a `barcode` of type `QR_CODE` whose value is
   `context.profileUrl`.
3. **"Add to Google Wallet" link** — a JWT with claims
   `{ iss: serviceAccountEmail, aud: 'google', typ: 'savetowallet', payload: { genericObjects: [...] } }`,
   signed RS256 with the private key, appended to `https://pay.google.com/gp/v/save/<jwt>`.
   Return `{ kind: 'link', url, externalId }`.
4. **Updates** are a `PATCH` on the object id. Because the id derives from `profileId`, a
   profile edit can push a live update to passes already saved — which is why `external_id`
   is persisted.

### Constraints that must hold

- JWT signing happens in Nitro. The browser receives only the finished save URL, which is
  scoped to one pass object and carries no reusable credential.
- The private key exists only as an environment variable. `integration_settings` has a trigger
  that rejects credential-shaped keys precisely so it cannot end up in the database.

---

## Bookkeeping

`wallet_passes` records the outcome of generation attempts:

| Column | Purpose |
|---|---|
| `profile_id`, `provider` | Unique together — one row per pair |
| `external_id` | Apple `serialNumber` / Google object id. **Stability matters** — it is how updates reach installed passes. |
| `status` | `pending` · `active` · `revoked` · `failed` |
| `last_generated_at` | For the dashboard |
| `last_error` | Sanitised, truncated to 500 characters |

`last_error` goes through `sanitiseProviderError()` first, which strips PEM blocks, bearer
tokens and JWTs and collapses whitespace. A raw provider error can embed a request payload
including a token, and this table is readable by administrators.

The table contains **no credentials**. It records the result of talking to a provider, never
the means to do so.

---

## Enabling a provider

1. Provision the credentials above and set them in the deployment environment as secrets.
2. Redeploy. `status()` now reports `configured: true`.
3. Implement `generate()` in that adapter — the only remaining code change.
4. In the dashboard, **Settings → Integrations**, switch the provider on. The toggle is
   disabled until the server reports credentials, because `enabled` (an operator preference)
   and `configured` (a server fact) are two independent things and collapsing them into one
   switch would be a lie.
5. Verify: the wallet buttons appear on a published profile, and
   `/api/public/wallet-status` returns `true` for that provider.
