-- =============================================================================
-- 20260817000100_init_enums_and_helpers
--
-- Enumerated domains and the shared trigger helpers every table relies on.
--
-- Every value defined here has a mirror in shared/constants/*.ts. When you change
-- an enum, update the matching constant file and run `pnpm db:types`.
-- =============================================================================

-- gen_random_uuid() lives in pgcrypto, which Supabase installs into `extensions`.
create extension if not exists "pgcrypto" with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

-- Mirrors shared/constants/locales.ts
create type public.locale_code as enum ('en', 'ar');

-- Mirrors shared/constants/profiles.ts
create type public.profile_type as enum ('individual', 'company');

create type public.profile_status as enum ('draft', 'published', 'inactive');

create type public.profile_link_type as enum (
  'website',
  'linkedin',
  'x',
  'instagram',
  'facebook',
  'youtube',
  'whatsapp',
  'telegram',
  'email',
  'phone',
  'location',
  'custom'
);

-- Mirrors shared/constants/roles.ts
create type public.app_role as enum ('admin', 'super_admin');

-- Mirrors shared/constants/wallet.ts
create type public.wallet_provider as enum ('apple', 'google');

create type public.wallet_pass_status as enum ('pending', 'active', 'revoked', 'failed');

-- -----------------------------------------------------------------------------
-- Shared trigger helpers
-- -----------------------------------------------------------------------------

-- Keeps updated_at honest regardless of what the client sends.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE trigger: stamps updated_at with the server clock.';

-- -----------------------------------------------------------------------------
-- Reusable validation expressions
--
-- These are immutable so they can be used inside CHECK constraints.
-- -----------------------------------------------------------------------------

-- Public URL slug: lowercase kebab-case. Mirrors SLUG_PATTERN in
-- shared/constants/profiles.ts.
create or replace function public.is_valid_slug(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
$$;

-- E.164, the only phone format that works in a vCard, a tel: link and WhatsApp.
create or replace function public.is_valid_e164(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value ~ '^\+[1-9][0-9]{6,14}$'
$$;

-- Deliberately permissive: real address validation belongs to Supabase Auth and
-- the Zod schemas. This only stops obvious junk reaching the database.
create or replace function public.is_valid_email(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value ~ '^[^@[:space:]]+@[^@[:space:]]+\.[A-Za-z]{2,}$'
$$;

-- Only protocols that are safe to place in an href. Blocks javascript: and data:
-- payloads at the storage layer, in addition to the Zod check.
create or replace function public.is_safe_link(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value ~* '^(https?://|mailto:|tel:)'
$$;

-- Storage object keys are always derived server-side; this rejects traversal and
-- absolute paths defensively.
create or replace function public.is_valid_storage_path(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value !~ '\.\.' and value !~ '^/'
$$;

create or replace function public.is_valid_hex_color(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value ~ '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$'
$$;
