-- =============================================================================
-- 20260817000600_row_level_security
--
-- Row Level Security for every table in `public`.
--
-- THREAT MODEL
--   The publishable (anon) key ships in the browser bundle. Anyone can take it and
--   query the REST API directly. Therefore RLS — not the application — is the real
--   access-control boundary, and it is written to be correct on its own:
--
--     * anonymous callers may read PUBLISHED profiles and their ENABLED links, plus
--       public organization and branding information. Nothing else. No writes, ever.
--     * authenticated callers get nothing extra unless they have an active row in
--       admin_users; being signed in is not being an administrator.
--     * admins are confined to their own organization; super admins are not.
--     * wallet passes and integration settings are invisible to anonymous callers.
--
--   Policies are split per command (and per role where it clarifies intent) rather
--   than using FOR ALL, so that each grant is auditable in isolation.
--
--   The secret/service-role key bypasses RLS entirely. That is why it is confined to
--   Nitro and why every server route that uses it re-checks authorization itself
--   (server/utils/auth.ts).
-- =============================================================================

alter table public.organizations enable row level security;
alter table public.organization_branding enable row level security;
alter table public.admin_users enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_links enable row level security;
alter table public.wallet_passes enable row level security;
alter table public.integration_settings enable row level security;

-- -----------------------------------------------------------------------------
-- organizations
--
-- Readable by everyone: the columns are corporate contact details already
-- published on pioneersunited.com, and the public company profile needs them.
-- -----------------------------------------------------------------------------

create policy "organizations: public read"
  on public.organizations
  for select
  to anon, authenticated
  using (true);

create policy "organizations: super admin insert"
  on public.organizations
  for insert
  to authenticated
  with check (public.is_super_admin());

create policy "organizations: super admin update"
  on public.organizations
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "organizations: super admin delete"
  on public.organizations
  for delete
  to authenticated
  using (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- organization_branding
--
-- Public read so an unauthenticated visitor's profile page can be themed without
-- an extra authenticated round trip. Writes are a super_admin concern.
-- -----------------------------------------------------------------------------

create policy "branding: public read"
  on public.organization_branding
  for select
  to anon, authenticated
  using (true);

create policy "branding: super admin insert"
  on public.organization_branding
  for insert
  to authenticated
  with check (public.is_super_admin());

create policy "branding: super admin update"
  on public.organization_branding
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "branding: super admin delete"
  on public.organization_branding
  for delete
  to authenticated
  using (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- admin_users
--
-- No anon policy at all: the roster of administrators is not public. A signed-in
-- administrator may read its own row (that is how the dashboard resolves its
-- session); only super admins see or change anyone else's.
-- -----------------------------------------------------------------------------

create policy "admin_users: read own row or super admin"
  on public.admin_users
  for select
  to authenticated
  using (id = auth.uid() or public.is_super_admin());

create policy "admin_users: super admin insert"
  on public.admin_users
  for insert
  to authenticated
  with check (public.is_super_admin());

create policy "admin_users: super admin update"
  on public.admin_users
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "admin_users: super admin delete"
  on public.admin_users
  for delete
  to authenticated
  using (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

-- The public contract: published rows only. `draft` and `inactive` profiles are
-- invisible to anonymous callers even if they guess the slug.
create policy "profiles: anonymous read published"
  on public.profiles
  for select
  to anon
  using (status = 'published');

create policy "profiles: authenticated read published or own organization"
  on public.profiles
  for select
  to authenticated
  using (
    status = 'published'
    or public.can_manage_organization(organization_id)
  );

create policy "profiles: admin insert in own organization"
  on public.profiles
  for insert
  to authenticated
  with check (public.can_manage_organization(organization_id));

-- Both USING and WITH CHECK are required: USING decides which rows may be updated,
-- WITH CHECK stops an update from moving a row into another organization.
create policy "profiles: admin update in own organization"
  on public.profiles
  for update
  to authenticated
  using (public.can_manage_organization(organization_id))
  with check (public.can_manage_organization(organization_id));

-- Deletion is destructive and breaks a public link, so it is super_admin only —
-- matching profiles:delete in shared/constants/roles.ts.
create policy "profiles: super admin delete"
  on public.profiles
  for delete
  to authenticated
  using (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- profile_links
--
-- Visibility is inherited from the parent profile: a link is public only when it is
-- enabled AND its profile is published.
-- -----------------------------------------------------------------------------

create policy "profile_links: anonymous read enabled links of published profiles"
  on public.profile_links
  for select
  to anon
  using (
    enabled
    and exists (
      select 1
      from public.profiles p
      where p.id = profile_links.profile_id
        and p.status = 'published'
    )
  );

create policy "profile_links: authenticated read"
  on public.profile_links
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_links.profile_id
        and (
          (p.status = 'published' and profile_links.enabled)
          or public.can_manage_organization(p.organization_id)
        )
    )
  );

create policy "profile_links: admin insert"
  on public.profile_links
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_links.profile_id
        and public.can_manage_organization(p.organization_id)
    )
  );

create policy "profile_links: admin update"
  on public.profile_links
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_links.profile_id
        and public.can_manage_organization(p.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_links.profile_id
        and public.can_manage_organization(p.organization_id)
    )
  );

create policy "profile_links: admin delete"
  on public.profile_links
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_links.profile_id
        and public.can_manage_organization(p.organization_id)
    )
  );

-- -----------------------------------------------------------------------------
-- wallet_passes
--
-- No anon policy: pass bookkeeping is internal. Public "Add to wallet" buttons go
-- through a Nitro route that generates the artifact server-side; the browser never
-- reads this table.
-- -----------------------------------------------------------------------------

create policy "wallet_passes: admin read"
  on public.wallet_passes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = wallet_passes.profile_id
        and public.can_manage_organization(p.organization_id)
    )
  );

create policy "wallet_passes: admin insert"
  on public.wallet_passes
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = wallet_passes.profile_id
        and public.can_manage_organization(p.organization_id)
    )
  );

create policy "wallet_passes: admin update"
  on public.wallet_passes
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = wallet_passes.profile_id
        and public.can_manage_organization(p.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = wallet_passes.profile_id
        and public.can_manage_organization(p.organization_id)
    )
  );

create policy "wallet_passes: super admin delete"
  on public.wallet_passes
  for delete
  to authenticated
  using (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- integration_settings
--
-- Admins of the organization can read (the dashboard shows whether a provider is
-- on); only super admins can change it.
-- -----------------------------------------------------------------------------

create policy "integration_settings: admin read own organization"
  on public.integration_settings
  for select
  to authenticated
  using (public.can_manage_organization(organization_id));

create policy "integration_settings: super admin insert"
  on public.integration_settings
  for insert
  to authenticated
  with check (public.is_super_admin());

create policy "integration_settings: super admin update"
  on public.integration_settings
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "integration_settings: super admin delete"
  on public.integration_settings
  for delete
  to authenticated
  using (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- Table privileges
--
-- RLS only filters rows a role is already allowed to touch. Supabase grants broad
-- privileges to anon/authenticated by default, so the write privileges anon must
-- never need are revoked here as a second, independent barrier: even a policy
-- mistake cannot turn into an anonymous write.
-- -----------------------------------------------------------------------------

revoke insert, update, delete, truncate on all tables in schema public from anon;

grant select on public.organizations to anon, authenticated;
grant select on public.organization_branding to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select on public.profile_links to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.profile_links to authenticated;
grant select, insert, update, delete on public.wallet_passes to authenticated;
grant select, insert, update, delete on public.integration_settings to authenticated;
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_branding to authenticated;
grant select, insert, update, delete on public.admin_users to authenticated;
