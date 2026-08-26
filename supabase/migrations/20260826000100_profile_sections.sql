-- =============================================================================
-- 20260826000100_profile_sections
--
-- Structured content blocks for Digital Profiles.
--
-- WHY A GENERIC TABLE RATHER THAN ONE TABLE PER BLOCK
--   The content review (docs/content-architecture.md) proposed roughly a dozen new
--   block types across executive, company and future project profiles: highlight
--   metrics, expertise, career history, credentials, recognition, languages,
--   documents, services, offices. Modelling each as its own table would mean a
--   migration, a repository, a service branch and an admin form apiece, and the
--   list is expected to keep growing.
--
--   Instead: one ordered, individually toggleable row per block, carrying a `kind`
--   and a JSONB `payload`. The payload's shape per kind is defined exactly once, in
--   shared/schemas/profile-section.schema.ts, and enforced by that Zod schema on
--   every write — the same schema the dashboard form uses. Adding a block type is a
--   new schema variant plus a renderer, not four files and a migration.
--
--   The trade-off is deliberate and bounded: the database guarantees the envelope
--   (an object, size-capped, correctly ordered, correctly scoped to a profile) while
--   the API boundary guarantees the contents. This is the same line the codebase
--   already draws in 20260817000400_profiles — fixed channels that the vCard must be
--   able to identify are columns; open-ended, ordered, user-toggleable content is
--   rows.
--
-- ONE SECTION PER KIND PER PROFILE
--   Enforced by a unique index. A profile has *a* career history, not two, and the
--   section navigation needs one unambiguous anchor per kind. Relaxing this later is
--   a non-destructive index drop; discovering duplicates in the wild is not.
-- =============================================================================

-- Mirrors PROFILE_SECTION_KINDS in shared/constants/profile-sections.ts.
create type public.profile_section_kind as enum (
  'metrics',
  'expertise',
  'experience',
  'credentials',
  'recognition',
  'languages',
  'documents',
  'services',
  'offices'
);

-- -----------------------------------------------------------------------------
-- Positioning line and booking link
--
-- Both are genuinely singular per profile, so they are columns rather than
-- sections. `headline` is the one sentence between the job title and the bio; the
-- hero renders it, and until now there was nowhere to put it. `booking_url` is the
-- second call to action beside "Save contact".
-- -----------------------------------------------------------------------------

alter table public.profiles
  add column headline_en text,
  add column headline_ar text,
  add column booking_url text;

alter table public.profiles
  add constraint profiles_headline_length check (
    (headline_en is null or length(headline_en) <= 240)
    and (headline_ar is null or length(headline_ar) <= 240)
  ),
  add constraint profiles_booking_url_safe check (
    booking_url is null or public.is_safe_link(booking_url)
  );

comment on column public.profiles.headline_en is
  'One-sentence positioning line rendered between the job title and the bio. Not the bio.';
comment on column public.profiles.booking_url is
  'Scheduling link surfaced as a secondary action beside Save contact.';

-- -----------------------------------------------------------------------------
-- profile_sections
-- -----------------------------------------------------------------------------

create table public.profile_sections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,

  kind public.profile_section_kind not null,

  -- Optional heading override. When null the UI falls back to the translated
  -- default for the kind, which is what keeps a profile bilingual for free.
  title_en text,
  title_ar text,

  payload jsonb not null default '{}'::jsonb,

  sort_order integer not null default 0,
  enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profile_sections_sort_order_range check (sort_order between 0 and 999),
  constraint profile_sections_title_length check (
    (title_en is null or length(title_en) <= 120)
    and (title_ar is null or length(title_ar) <= 120)
  ),
  -- The envelope the database owns: an object, never an array or a scalar.
  constraint profile_sections_payload_object check (jsonb_typeof(payload) = 'object'),
  -- A cap so a runaway payload cannot become a denial-of-service on the public
  -- profile read. 32 KB is far above any realistic block.
  constraint profile_sections_payload_size check (length(payload::text) <= 32768)
);

create unique index profile_sections_profile_kind_key
  on public.profile_sections (profile_id, kind);

-- The public profile read: every enabled section for one profile, in order.
create index profile_sections_profile_id_sort_idx
  on public.profile_sections (profile_id, sort_order, id);

create index profile_sections_enabled_idx
  on public.profile_sections (profile_id) where enabled;

create trigger profile_sections_set_updated_at
  before update on public.profile_sections
  for each row execute function public.set_updated_at();

comment on table public.profile_sections is
  'Ordered, individually toggleable structured content blocks on a Digital Profile. Payload shape per kind is defined in shared/schemas/profile-section.schema.ts and validated at the API boundary.';
comment on column public.profile_sections.payload is
  'Kind-specific content. Validated by the matching Zod variant on every write; the database guarantees only that it is a size-capped JSON object.';

-- -----------------------------------------------------------------------------
-- Row Level Security
--
-- Visibility is inherited from the parent profile, exactly as profile_links does:
-- a section is public only when it is enabled AND its profile is published.
-- -----------------------------------------------------------------------------

alter table public.profile_sections enable row level security;

create policy "profile_sections: anonymous read enabled sections of published profiles"
  on public.profile_sections
  for select
  to anon
  using (
    enabled
    and exists (
      select 1
      from public.profiles p
      where p.id = profile_sections.profile_id
        and p.status = 'published'
    )
  );

create policy "profile_sections: authenticated read"
  on public.profile_sections
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_sections.profile_id
        and (
          (p.status = 'published' and profile_sections.enabled)
          or public.can_manage_organization(p.organization_id)
        )
    )
  );

create policy "profile_sections: admin insert"
  on public.profile_sections
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_sections.profile_id
        and public.can_manage_organization(p.organization_id)
    )
  );

create policy "profile_sections: admin update"
  on public.profile_sections
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_sections.profile_id
        and public.can_manage_organization(p.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_sections.profile_id
        and public.can_manage_organization(p.organization_id)
    )
  );

create policy "profile_sections: admin delete"
  on public.profile_sections
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_sections.profile_id
        and public.can_manage_organization(p.organization_id)
    )
  );

-- -----------------------------------------------------------------------------
-- Privileges
--
-- Mirrors 20260817000600: anon may read and never write; the revoke is repeated
-- because it applies to tables existing at the time it ran, not future ones.
-- -----------------------------------------------------------------------------

revoke insert, update, delete, truncate on public.profile_sections from anon;

grant select on public.profile_sections to anon, authenticated;
grant select, insert, update, delete on public.profile_sections to authenticated;
