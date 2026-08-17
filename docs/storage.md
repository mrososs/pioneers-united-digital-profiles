# Storage strategy

Supabase Storage holds profile photographs, brand assets and generated wallet passes.
Buckets are created and configured by `supabase/migrations/20260817000700_storage.sql`, not
by hand, so the strategy is reproducible in every environment.

---

## Buckets

| Bucket | Visibility | Size limit | Accepted types | Contents |
|---|---|---|---|---|
| `profile-media` | **public** | 5 MB | `image/jpeg` `image/png` `image/webp` `image/avif` | Profile photographs |
| `brand-assets` | **public** | 2 MB | the above **+ `image/svg+xml`** | Logos, favicons, social share images |
| `wallet-passes` | **private** | 1 MB | `application/vnd.apple.pkpass` `image/png` | Generated passes and pass artwork |

Definitions live in one place, `shared/constants/storage.ts`, and are enforced in three
independent layers:

1. the browser, for immediate feedback;
2. the Nitro upload handler — the authoritative application check;
3. the bucket's own `allowed_mime_types` and `file_size_limit`, enforced by Storage itself.

**Changing a limit means changing both the constant and the migration.** They are asserted
against each other by comment, not by code, so this is the one place that needs discipline.

---

## Public vs private, and why

### `profile-media` and `brand-assets` are public

A profile photograph is served to every anonymous visitor of a published profile. Signed URLs
would:

- **defeat CDN caching** — a unique URL per request is uncacheable;
- **expire inside shared links** — a profile URL pasted into WhatsApp is opened days later,
  and a preview card fetching an expired image shows a broken thumbnail;
- **add a round trip** to every page render for no security benefit, since the content is
  intended to be public.

The security boundary for these buckets is therefore on the **write** side, not the read side.

### `wallet-passes` is private

A wallet pass embeds one person's contact details and is addressed to a single recipient. It
is never world-readable. Read access is via short-lived signed URLs issued by Nitro;
administrators can list passes, and writes happen only through the server.

---

## Upload permissions

| Bucket | Read | Insert / Update | Delete |
|---|---|---|---|
| `profile-media` | `anon`, `authenticated` | active admin | active admin |
| `brand-assets` | `anon`, `authenticated` | **super_admin only** | super_admin |
| `wallet-passes` | active admin | **nobody** — server (secret key) only | super_admin |

`brand-assets` writes are restricted to super admins **because that bucket accepts SVG**, and
an SVG is an executable document. Anyone who can upload one to a served origin can serve
script. Restricting the write, keeping the files on the Storage origin rather than the app
origin, and refusing SVG in `profile-media` are three separate mitigations of the same risk.

`wallet-passes` has no `authenticated` write policy at all: passes are written by Nitro using
the secret key, which bypasses RLS. Granting a policy that nothing uses would be an
unnecessary hole.

---

## File naming

**Object keys are always derived server-side. A client-supplied name is never used.**

```text
profile-media/profiles/<profileId>/photo-<epochMs>.<ext>
brand-assets/organizations/<organizationId>/<kind>-<epochMs>.<ext>
   kind ∈ logo | logo-dark | favicon | og-image
```

Built by `buildProfilePhotoKey()` and `buildBrandAssetKey()` in
`shared/constants/storage.ts`.

Each part earns its place:

- **the id prefix** scopes objects to their owner, so a policy or an audit can reason about
  ownership from the path;
- **the epoch suffix** makes every upload a new key, so a replaced photo does not need cache
  invalidation and cannot be silently overwritten (`upsert: false` — a collision means a bug);
- **the extension comes from the DETECTED type**, not the uploaded filename, falling back to
  `.bin` for anything unrecognised.

Accepting a client filename is how you get path traversal (`../../other-profile/photo.jpg`),
overwrites of another executive's photograph, and content-type confusion from a misleading
extension.

The database stores the **object key**, never a full URL. URLs are derived at read time by
`publicStorageUrl()`, so the storage origin — or a CDN placed in front of it — can change
without a data migration.

---

## Preventing arbitrary uploads

`server/api/admin/media/upload.post.ts` is the only write path. Every upload passes:

1. **Authorization** — `requireAdmin`, and `requireCapability('branding:write')` for brand
   assets.
2. **Size** — checked before anything is written.
3. **Magic-byte type detection** — the payload's actual signature is read and matched. The
   declared `Content-Type` is treated as a hint, nothing more.
4. **Bucket allow-list** — the detected type must be permitted for that bucket.
5. **Derived key** — computed from ids and the detected type.
6. **Bucket-level enforcement** — Storage re-checks type and size independently.

Step 3 is the one that matters most. A `.svg` renamed to `.png` and sent with
`Content-Type: image/png` passes any header-based check, and then executes when a browser
loads it. The signature check catches it.

Signatures currently recognised:

| Type | Signature |
|---|---|
| JPEG | `FF D8 FF` |
| PNG | `89 50 4E 47 0D 0A 1A 0A` |
| WebP | `RIFF` … `WEBP` |
| AVIF | `ftyp` at offset 4, brand `avif`/`avis` at offset 8 |
| SVG | no binary magic — the document must begin with `<?xml`, `<svg` or `<!doctype svg` after an optional BOM and whitespace |

---

## What is never in Storage

**No credentials, of any kind.**

- Apple pass signing certificate (`.p12`) and its password
- Apple WWDR intermediate certificate
- Google Wallet service-account private key
- The Supabase secret key

These are server-side environment variables only. `.gitignore` blocks `*.p12`, `*.pem`,
`*.key`, `*.cer` and `*-service-account.json` so they cannot be committed by accident. See
`docs/wallet.md`.

---

## Adding a bucket

1. Add it to `STORAGE_BUCKETS` and `BUCKET_CONSTRAINTS` in `shared/constants/storage.ts`.
2. Write a migration that inserts into `storage.buckets` with matching
   `allowed_mime_types` and `file_size_limit`.
3. In the same migration, add explicit `storage.objects` policies — one per command, scoped
   `TO anon` / `TO authenticated`. **A bucket without policies is a security bug.**
4. Add a key-builder function so keys stay derived.
5. Extend `tests/unit/storage.spec.ts` — visibility and MIME expectations are asserted there.
6. Document the bucket in the table at the top of this file.
