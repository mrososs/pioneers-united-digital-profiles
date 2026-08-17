-- =============================================================================
-- 20260817000400_profiles
--
-- The core table. One row per Digital Profile, individual or company.
--
-- SLUG SCOPE
--   The public route is /{locale}/{slug} — there is no tenant segment in the URL,
--   so a slug must be globally unique, not unique per organization. If this
--   platform ever serves a second organization on its own hostname, relax the
--   unique index to (organization_id, slug) and add the host to the route.
--
-- BILINGUAL COLUMNS
--   Paired *_en / *_ar columns rather than a translations table. There are exactly
--   two locales, both are mandatory for names, and every read needs both (hreflang
--   alternates, the language switcher, the vCard). A join table would add a query
--   and a mapping layer to buy flexibility the product does not need. Revisit if a
--   third locale is ever added.
-- =============================================================================

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,

  slug text not null,
  profile_type public.profile_type not null default 'individual',
  status public.profile_status not null default 'draft',

  name_en text not null,
  name_ar text not null,

  job_title_en text,
  job_title_ar text,
  department_en text,
  department_ar text,
  bio_en text,
  bio_ar text,
  location_en text,
  location_ar text,

  email text,
  phone text,
  whatsapp text,
  linkedin_url text,
  website_url text,

  photo_path text,

  published_at timestamptz,

  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_slug_format check (public.is_valid_slug(slug)),
  constraint profiles_slug_length check (length(slug) between 2 and 80),
  constraint profiles_name_en_not_blank check (length(btrim(name_en)) > 0),
  constraint profiles_name_ar_not_blank check (length(btrim(name_ar)) > 0),
  constraint profiles_email_format check (email is null or public.is_valid_email(email)),
  constraint profiles_phone_format check (phone is null or public.is_valid_e164(phone)),
  constraint profiles_whatsapp_format check (whatsapp is null or public.is_valid_e164(whatsapp)),
  constraint profiles_linkedin_safe check (linkedin_url is null or public.is_safe_link(linkedin_url)),
  constraint profiles_website_safe check (website_url is null or public.is_safe_link(website_url)),
  constraint profiles_photo_path_valid check (photo_path is null or public.is_valid_storage_path(photo_path)),
  constraint profiles_bio_length check (
    (bio_en is null or length(bio_en) <= 2000)
    and (bio_ar is null or length(bio_ar) <= 2000)
  ),
  -- A published profile always has a publication timestamp. The trigger below
  -- maintains it, so this only catches direct SQL that bypasses the application.
  constraint profiles_published_has_timestamp check (status <> 'published' or published_at is not null)
);

-- Globally unique: the slug IS the public URL.
create unique index profiles_slug_key on public.profiles (slug);

-- The public profile lookup: one row by slug, only when published.
create index profiles_published_slug_idx on public.profiles (slug) where status = 'published';

-- The admin list view: filtered by tenant and status, newest first.
create index profiles_organization_status_idx on public.profiles (organization_id, status);
create index profiles_updated_at_idx on public.profiles (updated_at desc);
create index profiles_published_at_idx on public.profiles (published_at desc) where status = 'published';

-- Company profiles are looked up on their own (the /settings/company screen and
-- the company card embedded in every individual profile).
create index profiles_organization_type_idx on public.profiles (organization_id, profile_type);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- published_at lifecycle
--
-- Set on the transition into `published`, preserved on re-publish, cleared when a
-- profile leaves `published`. Doing this in the database means a direct SQL fix or
-- a future second client cannot get it wrong.
-- -----------------------------------------------------------------------------

create or replace function public.profiles_sync_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  elsif new.status <> 'published' then
    new.published_at := null;
  end if;

  return new;
end;
$$;

create trigger profiles_sync_published_at
  before insert or update on public.profiles
  for each row execute function public.profiles_sync_published_at();

comment on table public.profiles is
  'Digital Profiles. profile_type distinguishes an individual executive from the company profile; both are served by the same public route and the same code path.';
comment on column public.profiles.slug is
  'Globally unique public URL segment: profile.pioneersunited.com/{locale}/{slug}.';
comment on column public.profiles.photo_path is
  'Object key inside the profile-media storage bucket. Never a full URL — URLs are derived at read time so the storage origin can change.';
comment on column public.profiles.published_at is
  'Maintained by the profiles_sync_published_at trigger. Do not set it directly.';

-- -----------------------------------------------------------------------------
-- Profile links
--
-- DECISION: a dedicated table rather than more nullable columns.
--
-- The canonical contact channels (email, phone, whatsapp, linkedin_url,
-- website_url) stay as columns on `profiles` because they are a fixed, mandatory
-- part of the vCard and wallet-pass mapping — a vCard needs to know *which* field
-- is the work telephone, and an ordered list cannot express that.
--
-- Everything beyond that set is open-ended, user-ordered and individually
-- toggleable, which is exactly what rows are for. Adding a column per network
-- would mean a migration for every new platform and a table full of NULLs.
-- -----------------------------------------------------------------------------

create table public.profile_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,

  type public.profile_link_type not null,
  label_en text,
  label_ar text,
  url text not null,

  sort_order integer not null default 0,
  enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profile_links_url_safe check (public.is_safe_link(url)),
  constraint profile_links_url_length check (length(url) between 4 and 2048),
  constraint profile_links_sort_order_range check (sort_order between 0 and 999),
  constraint profile_links_label_length check (
    (label_en is null or length(label_en) <= 80)
    and (label_ar is null or length(label_ar) <= 80)
  )
);

create index profile_links_profile_id_sort_idx on public.profile_links (profile_id, sort_order, id);
create index profile_links_enabled_idx on public.profile_links (profile_id) where enabled;

create trigger profile_links_set_updated_at
  before update on public.profile_links
  for each row execute function public.set_updated_at();

comment on table public.profile_links is
  'Ordered, individually toggleable extra links rendered on a public profile. Canonical contact channels live on profiles.* instead — see the migration header.';
