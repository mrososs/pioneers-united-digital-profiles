-- =============================================================================
-- 20260817000700_storage
--
-- Supabase Storage bucket strategy. Full rationale in docs/storage.md.
--
--   profile-media   PUBLIC   profile photographs
--                            Public because a profile photo is served to every
--                            anonymous visitor of a published profile; signed URLs
--                            would defeat CDN caching and expire inside shared
--                            links. Raster formats only — no SVG, which is an
--                            executable document.
--
--   brand-assets    PUBLIC   logos, favicons, social share images
--                            Same reasoning. SVG is permitted here because these
--                            are uploaded by super admins only, and Supabase serves
--                            them from the storage origin rather than the app origin.
--
--   wallet-passes   PRIVATE  generated .pkpass bundles and pass artwork
--                            A wallet pass embeds personal contact details and is
--                            addressed to one recipient, so it is never public. Read
--                            access is via short-lived signed URLs issued by Nitro.
--
-- Signing certificates and service-account keys are NOT stored here. They are
-- environment variables. Nothing in Storage is a credential.
--
-- Bucket-level `allowed_mime_types` and `file_size_limit` mirror
-- shared/constants/storage.ts and are enforced by Storage itself, independently of
-- the application.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'profile-media',
    'profile-media',
    true,
    5242880, -- 5 MB, = MAX_PROFILE_PHOTO_BYTES
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'brand-assets',
    'brand-assets',
    true,
    2097152, -- 2 MB, = MAX_BRAND_ASSET_BYTES
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']
  ),
  (
    'wallet-passes',
    'wallet-passes',
    false,
    1048576, -- 1 MB, = MAX_WALLET_ASSET_BYTES
    array['application/vnd.apple.pkpass', 'image/png']
  )
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- storage.objects policies
--
-- RLS is already enabled on storage.objects by Supabase; only policies are added.
-- Object keys are always derived server-side (see buildProfilePhotoKey in
-- shared/constants/storage.ts), so no policy needs to parse a client-supplied path.
-- -----------------------------------------------------------------------------

-- profile-media -----------------------------------------------------------------

-- A public bucket is readable through the CDN regardless; this makes the intent
-- explicit and keeps the authenticated path consistent.
create policy "profile-media: public read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'profile-media');

create policy "profile-media: admin upload"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'profile-media' and public.is_active_admin());

create policy "profile-media: admin update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'profile-media' and public.is_active_admin())
  with check (bucket_id = 'profile-media' and public.is_active_admin());

create policy "profile-media: admin delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'profile-media' and public.is_active_admin());

-- brand-assets ------------------------------------------------------------------

create policy "brand-assets: public read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'brand-assets');

-- Brand assets accept SVG, so writes are restricted to super admins.
create policy "brand-assets: super admin upload"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'brand-assets' and public.is_super_admin());

create policy "brand-assets: super admin update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'brand-assets' and public.is_super_admin())
  with check (bucket_id = 'brand-assets' and public.is_super_admin());

create policy "brand-assets: super admin delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'brand-assets' and public.is_super_admin());

-- wallet-passes -----------------------------------------------------------------

-- No anon policy. Administrators may list and inspect generated passes; writes
-- happen exclusively through Nitro using the secret key, which bypasses RLS, so no
-- INSERT/UPDATE policy is granted to `authenticated` at all.
create policy "wallet-passes: admin read"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'wallet-passes' and public.is_active_admin());

create policy "wallet-passes: super admin delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'wallet-passes' and public.is_super_admin());
