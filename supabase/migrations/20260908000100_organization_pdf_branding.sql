-- =============================================================================
-- 20260908000100_organization_pdf_branding
--
-- Colours for the exported profile PDF (server/services/pdf/pdf.service.ts),
-- separate from `organization_branding`.
--
-- WHY A SEPARATE TABLE RATHER THAN MORE COLUMNS ON organization_branding
--   `organization_branding` drives the live, interactive profile and its CSS
--   custom properties (app/assets/css/main.css) with one value per role
--   (primary, accent, ...). The PDF export needs a DIFFERENT shape: one
--   background/text/line trio for an individual profile and a second trio for
--   the company profile, because the two document types are printed and
--   handed out separately and an operator may legitimately want the company
--   one-pager to look different from an executive's. Folding that into
--   `organization_branding` would mean six more nullable columns bolted onto
--   a table that otherwise means "the live site's palette" — a different
--   concern with a different settings screen, so it gets its own table, same
--   reasoning already applied to split `organization_branding` off
--   `organizations` in 20260817000200.
--
-- 1:1 with organizations, same pattern as organization_branding: the primary
-- key is the foreign key, so there is exactly one row per organization and an
-- upsert is the only write path.
-- =============================================================================

create table public.organization_pdf_branding (
  organization_id uuid primary key references public.organizations (id) on delete cascade,

  individual_background_color text,
  individual_text_color text,
  individual_line_color text,

  company_background_color text,
  company_text_color text,
  company_line_color text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pdf_branding_individual_bg_format
    check (individual_background_color is null or public.is_valid_hex_color(individual_background_color)),
  constraint pdf_branding_individual_text_format
    check (individual_text_color is null or public.is_valid_hex_color(individual_text_color)),
  constraint pdf_branding_individual_line_format
    check (individual_line_color is null or public.is_valid_hex_color(individual_line_color)),
  constraint pdf_branding_company_bg_format
    check (company_background_color is null or public.is_valid_hex_color(company_background_color)),
  constraint pdf_branding_company_text_format
    check (company_text_color is null or public.is_valid_hex_color(company_text_color)),
  constraint pdf_branding_company_line_format
    check (company_line_color is null or public.is_valid_hex_color(company_line_color))
);

create trigger organization_pdf_branding_set_updated_at
  before update on public.organization_pdf_branding
  for each row execute function public.set_updated_at();

comment on table public.organization_pdf_branding is
  'Background/text/line colours applied to the exported profile PDF, one trio for individual profiles and one for the company profile. Values feed server/services/pdf/pdf.service.ts via the print view; only validated hex colours are storable, never raw CSS.';

-- -----------------------------------------------------------------------------
-- Row Level Security
--
-- Same shape as organization_branding: publicly readable (the print view that
-- renders the PDF is an unauthenticated page, same as the profile itself),
-- writable only by a super admin.
-- -----------------------------------------------------------------------------

alter table public.organization_pdf_branding enable row level security;

create policy "pdf branding: public read"
  on public.organization_pdf_branding
  for select
  to anon, authenticated
  using (true);

create policy "pdf branding: super admin insert"
  on public.organization_pdf_branding
  for insert
  to authenticated
  with check (public.is_super_admin());

create policy "pdf branding: super admin update"
  on public.organization_pdf_branding
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "pdf branding: super admin delete"
  on public.organization_pdf_branding
  for delete
  to authenticated
  using (public.is_super_admin());

revoke insert, update, delete, truncate on public.organization_pdf_branding from anon;

grant select on public.organization_pdf_branding to anon, authenticated;
grant select, insert, update, delete on public.organization_pdf_branding to authenticated;
