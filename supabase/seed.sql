-- =============================================================================
--  ####  LOCAL DEVELOPMENT SEED — NOT FOR ANY SHARED OR PRODUCTION DATABASE  ####
-- =============================================================================
--
-- This file is executed by `supabase db reset`, which only ever targets the LOCAL
-- Docker stack. It is NOT executed by `supabase db push`, so it cannot reach a
-- linked project by accident.
--
-- Everything below is invented. The sample executive is fictional, the phone
-- numbers are inside reserved test ranges and the e-mail addresses use the
-- reserved `.test` TLD, which can never resolve. No real person's data is here,
-- and none may be added: real executive details are entered through the dashboard
-- against a real database.
--
-- The seeded administrator password is public knowledge by definition. It exists
-- so `pnpm db:reset && pnpm dev` gives a working login in one step. It must never
-- be reused anywhere reachable from the internet.
-- =============================================================================

-- Fixed UUIDs so seeded data is stable across resets and easy to reference.
-- ---------------------------------------------------------------------------
--   organization      11111111-1111-4111-8111-111111111111
--   super admin user  22222222-2222-4222-8222-222222222222
--   company profile   33333333-3333-4333-8333-333333333333
--   sample executive  44444444-4444-4444-8444-444444444444
-- ---------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Organization
-- -----------------------------------------------------------------------------

insert into public.organizations (
  id, slug, name_en, name_ar, tagline_en, tagline_ar,
  website, email, phone, address_en, address_ar
)
values (
  '11111111-1111-4111-8111-111111111111',
  'pioneers-united',
  'Pioneers United',
  'بيونيرز يونايتد',
  'Building what comes next',
  'نبني ما هو قادم',
  'https://pioneersunited.com',
  'info@pioneersunited.test',
  '+966555000000',
  'Riyadh, Kingdom of Saudi Arabia',
  'الرياض، المملكة العربية السعودية'
)
on conflict (id) do nothing;

insert into public.organization_branding (
  organization_id, primary_color, primary_foreground_color, accent_color,
  default_locale, footer_note_en, footer_note_ar
)
values (
  '11111111-1111-4111-8111-111111111111',
  '#192341',
  '#fcfdfd',
  '#e18146',
  'en',
  'Sample development data',
  'بيانات تطويرية للعرض'
)
on conflict (organization_id) do nothing;

-- -----------------------------------------------------------------------------
-- Local administrator
--
-- Email:    dev-admin@example.test
-- Password: LocalDevOnly!2026
--
-- Created directly in auth.users because the Supabase Auth API is not reachable
-- while the seed runs. `crypt()` comes from pgcrypto in the extensions schema.
-- -----------------------------------------------------------------------------

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values (
  '22222222-2222-4222-8222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'dev-admin@example.test',
  extensions.crypt('LocalDevOnly!2026', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  -- Note what is NOT here: no role. The application never reads a role from user
  -- metadata, because the user can write to it. The role lives in admin_users.
  '{"full_name": "Dev Administrator"}'::jsonb,
  now(),
  now(),
  -- GoTrue scans these as non-nullable Go strings. Inserting directly (rather
  -- than through the Auth API, which always sets them) leaves them NULL, which
  -- v2.195.0 fails to scan with "converting NULL to string is unsupported" on
  -- the very first password grant. Empty string, not NULL.
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  gen_random_uuid(),
  '22222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222',
  'email',
  '{"sub": "22222222-2222-4222-8222-222222222222", "email": "dev-admin@example.test", "email_verified": true, "phone_verified": false}'::jsonb,
  now(),
  now(),
  now()
)
on conflict do nothing;

insert into public.admin_users (id, organization_id, role, full_name, is_active)
values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'super_admin',
  'Dev Administrator',
  true
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Company Digital Profile
--
-- The company profile is an ordinary `profiles` row with profile_type = 'company'.
-- It is served by the same route and the same code path as an individual profile —
-- there is no separate company pipeline to keep in sync.
-- -----------------------------------------------------------------------------

insert into public.profiles (
  id, organization_id, slug, profile_type, status,
  name_en, name_ar,
  job_title_en, job_title_ar,
  bio_en, bio_ar,
  location_en, location_ar,
  email, phone, whatsapp, website_url,
  created_by, updated_by
)
values (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'pioneers-united',
  'company',
  'published',
  'Pioneers United',
  'بيونيرز يونايتد',
  'Building what comes next',
  'نبني ما هو قادم',
  'Sample development copy for the company Digital Profile. Replace this text with the approved corporate description before launch.',
  'نص تطويري تجريبي لملف الشركة الرقمي. يجب استبداله بالوصف المؤسسي المعتمد قبل الإطلاق.',
  'Riyadh, Saudi Arabia',
  'الرياض، السعودية',
  'info@pioneersunited.test',
  '+966555000000',
  '+966555000000',
  'https://pioneersunited.com',
  '22222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222'
)
on conflict (id) do nothing;

insert into public.profile_links (profile_id, type, label_en, label_ar, url, sort_order, enabled)
values
  (
    '33333333-3333-4333-8333-333333333333',
    'website', 'pioneersunited.com', 'pioneersunited.com',
    'https://pioneersunited.com', 0, true
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'linkedin', 'LinkedIn', 'لينكدإن',
    'https://www.linkedin.com/company/example-development-only', 1, true
  )
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Sample individual profile — FICTIONAL
--
-- Published so the public route can be exercised end to end:
--   http://localhost:3000/en/sample-executive
--   http://localhost:3000/ar/sample-executive
-- -----------------------------------------------------------------------------

insert into public.profiles (
  id, organization_id, slug, profile_type, status,
  name_en, name_ar,
  job_title_en, job_title_ar,
  department_en, department_ar,
  bio_en, bio_ar,
  location_en, location_ar,
  email, phone, whatsapp, linkedin_url, website_url,
  created_by, updated_by
)
values (
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  'sample-executive',
  'individual',
  'published',
  'Sample Executive (development data)',
  'نموذج تنفيذي (بيانات تطويرية)',
  'Chief Example Officer',
  'الرئيس التنفيذي للأمثلة',
  'Corporate Development',
  'التطوير المؤسسي',
  'This is fictional seed data used to verify the platform locally. It is not a real person. Replace or delete it before any shared environment.',
  'هذه بيانات تجريبية خيالية تُستخدم للتحقق من المنصة محليًا، ولا تمثل شخصًا حقيقيًا. يجب استبدالها أو حذفها قبل أي بيئة مشتركة.',
  'Riyadh, Saudi Arabia',
  'الرياض، السعودية',
  'sample.executive@example.test',
  '+966555000001',
  '+966555000001',
  'https://www.linkedin.com/in/example-development-only',
  'https://pioneersunited.com',
  '22222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222'
)
on conflict (id) do nothing;

insert into public.profile_links (profile_id, type, label_en, label_ar, url, sort_order, enabled)
values
  (
    '44444444-4444-4444-8444-444444444444',
    'website', 'Company website', 'موقع الشركة',
    'https://pioneersunited.com', 0, true
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'x', 'X', 'إكس',
    'https://x.com/example-development-only', 1, true
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'custom', 'Hidden link example', 'مثال رابط مخفي',
    'https://example.test/hidden', 2, false
  )
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- A draft profile, so RLS can be verified: this row must be invisible to an
-- anonymous caller and must 404 on the public route.
-- -----------------------------------------------------------------------------

insert into public.profiles (
  id, organization_id, slug, profile_type, status,
  name_en, name_ar, job_title_en, job_title_ar,
  created_by, updated_by
)
values (
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  'unpublished-example',
  'individual',
  'draft',
  'Unpublished Example (development data)',
  'مثال غير منشور (بيانات تطويرية)',
  'Draft Profile',
  'ملف مسودة',
  '22222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222'
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Integration settings — both providers present but disabled, because no
-- credentials exist locally. Note that `config` holds no secrets.
-- -----------------------------------------------------------------------------

insert into public.integration_settings (organization_id, provider, enabled, config)
values
  ('11111111-1111-4111-8111-111111111111', 'apple', false, '{"passStyle": "generic"}'::jsonb),
  ('11111111-1111-4111-8111-111111111111', 'google', false, '{"passClass": "generic"}'::jsonb)
on conflict (organization_id, provider) do nothing;
