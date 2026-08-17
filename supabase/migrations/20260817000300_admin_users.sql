-- =============================================================================
-- 20260817000300_admin_users
--
-- Authorization model. Two roles, no permission matrix table:
--
--   admin        -- manages profiles and content inside its own organization
--   super_admin  -- the above, plus organization settings, integrations and
--                   administrator management, across every organization
--
-- The row in `admin_users` is the ONLY source of truth for a role. Nothing reads
-- a role out of the JWT's user_metadata: that field is user-writable through the
-- Supabase Auth API, so trusting it would be a privilege-escalation hole.
--
-- The helper functions below are SECURITY DEFINER on purpose. They must read
-- admin_users while bypassing its own RLS policies, otherwise every policy that
-- calls them would recurse.
-- =============================================================================

create table public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete restrict,

  role public.app_role not null default 'admin',
  full_name text,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index admin_users_organization_id_idx on public.admin_users (organization_id);
create index admin_users_active_idx on public.admin_users (organization_id) where is_active;

create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

comment on table public.admin_users is
  'Dashboard operators. A row here is what grants dashboard access; deactivating (is_active = false) revokes it without deleting the audit trail.';
comment on column public.admin_users.role is
  'Authoritative role. Never mirrored into auth.users.raw_user_meta_data, which the user can write to.';

-- -----------------------------------------------------------------------------
-- Authorization helpers used by every RLS policy
-- -----------------------------------------------------------------------------

create or replace function public.current_admin_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select au.role
  from public.admin_users au
  where au.id = auth.uid()
    and au.is_active
$$;

comment on function public.current_admin_role() is
  'Role of the calling user, or NULL when the caller is anonymous or not an active administrator.';

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select au.organization_id
  from public.admin_users au
  where au.id = auth.uid()
    and au.is_active
$$;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active
  )
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active
      and au.role = 'super_admin'
  )
$$;

-- True when the caller may write records belonging to `target_organization_id`.
create or replace function public.can_manage_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_super_admin()
     or exists (
       select 1
       from public.admin_users au
       where au.id = auth.uid()
         and au.is_active
         and au.organization_id = target_organization_id
     )
$$;

comment on function public.can_manage_organization(uuid) is
  'Row-level tenancy check: super admins pass for every organization, admins only for their own.';

-- The helpers are invoked from policies evaluated as anon/authenticated, so both
-- roles need EXECUTE. They leak nothing: each returns only facts about the caller.
grant execute on function public.current_admin_role() to anon, authenticated;
grant execute on function public.current_organization_id() to anon, authenticated;
grant execute on function public.is_active_admin() to anon, authenticated;
grant execute on function public.is_super_admin() to anon, authenticated;
grant execute on function public.can_manage_organization(uuid) to anon, authenticated;
