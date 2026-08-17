-- =============================================================================
-- 20260817000200_organizations
--
-- The tenant table. This deployment serves Pioneers United, but nothing in the
-- schema or the application assumes exactly one row: every profile, branding
-- record and integration setting is scoped by organization_id.
-- =============================================================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),

  slug text not null,
  name_en text not null,
  name_ar text not null,
  tagline_en text,
  tagline_ar text,

  website text,
  email text,
  phone text,
  address_en text,
  address_ar text,

  logo_path text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organizations_slug_format check (public.is_valid_slug(slug)),
  constraint organizations_name_en_not_blank check (length(btrim(name_en)) > 0),
  constraint organizations_name_ar_not_blank check (length(btrim(name_ar)) > 0),
  constraint organizations_website_safe check (website is null or public.is_safe_link(website)),
  constraint organizations_email_format check (email is null or public.is_valid_email(email)),
  constraint organizations_phone_format check (phone is null or public.is_valid_e164(phone)),
  constraint organizations_logo_path_valid check (logo_path is null or public.is_valid_storage_path(logo_path))
);

create unique index organizations_slug_key on public.organizations (slug);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

comment on table public.organizations is
  'Companies whose digital profiles this deployment serves. Publicly readable: every column is corporate information already published elsewhere.';
comment on column public.organizations.logo_path is
  'Object key inside the brand-assets storage bucket. Never a full URL.';

-- -----------------------------------------------------------------------------
-- Branding
--
-- Split from `organizations` because it is a different concern with a different
-- write permission (super_admin only) and a different lifecycle: brand values are
-- edited by whoever owns the design system, not by whoever maintains contact
-- details. The 1:1 relationship is enforced by the primary key.
-- -----------------------------------------------------------------------------

create table public.organization_branding (
  organization_id uuid primary key references public.organizations (id) on delete cascade,

  primary_color text,
  primary_foreground_color text,
  accent_color text,

  logo_path text,
  logo_dark_path text,
  favicon_path text,
  og_image_path text,

  default_locale public.locale_code not null default 'en',

  footer_note_en text,
  footer_note_ar text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint branding_primary_color_format check (primary_color is null or public.is_valid_hex_color(primary_color)),
  constraint branding_primary_fg_format check (primary_foreground_color is null or public.is_valid_hex_color(primary_foreground_color)),
  constraint branding_accent_color_format check (accent_color is null or public.is_valid_hex_color(accent_color)),
  constraint branding_logo_path_valid check (logo_path is null or public.is_valid_storage_path(logo_path)),
  constraint branding_logo_dark_path_valid check (logo_dark_path is null or public.is_valid_storage_path(logo_dark_path)),
  constraint branding_favicon_path_valid check (favicon_path is null or public.is_valid_storage_path(favicon_path)),
  constraint branding_og_image_path_valid check (og_image_path is null or public.is_valid_storage_path(og_image_path))
);

create trigger organization_branding_set_updated_at
  before update on public.organization_branding
  for each row execute function public.set_updated_at();

comment on table public.organization_branding is
  'Design tokens and brand assets per organization. Values feed the semantic CSS custom properties in app/assets/css/main.css; only colours and asset keys are storable, never raw CSS.';
