-- =============================================================================
-- 20260817000500_wallet_and_integrations
--
-- Wallet pass bookkeeping and non-secret integration configuration.
--
-- WHAT IS *NOT* HERE, DELIBERATELY
--   No Apple pass certificate, no .p12 password, no Google service-account private
--   key, no signing material of any kind. Those live only in server-side
--   environment variables (see .env.example and docs/wallet.md). This table stores
--   the *result* of talking to a provider, never the means to do so.
-- =============================================================================

create table public.wallet_passes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,

  provider public.wallet_provider not null,

  -- Apple: the pass serialNumber. Google: the Wallet object id.
  external_id text,
  status public.wallet_pass_status not null default 'pending',

  last_generated_at timestamptz,
  -- Short, provider-supplied failure reason for the dashboard. Never a stack
  -- trace and never a credential; the handler truncates and sanitises it.
  last_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint wallet_passes_last_error_length check (last_error is null or length(last_error) <= 500),
  constraint wallet_passes_external_id_length check (external_id is null or length(external_id) <= 255)
);

-- One pass per profile per provider: regenerating updates the row in place so the
-- external_id (which the provider uses to push updates) stays stable.
create unique index wallet_passes_profile_provider_key
  on public.wallet_passes (profile_id, provider);

create index wallet_passes_status_idx on public.wallet_passes (status);

create trigger wallet_passes_set_updated_at
  before update on public.wallet_passes
  for each row execute function public.set_updated_at();

comment on table public.wallet_passes is
  'Tracks which profiles have Apple/Google wallet passes and when they were last generated. Contains no credentials.';

-- -----------------------------------------------------------------------------
-- Integration settings
--
-- `provider` is text with a CHECK rather than an enum so a future provider (a CRM,
-- an analytics sink) can be added without an enum migration and a type regen.
-- -----------------------------------------------------------------------------

create table public.integration_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,

  provider text not null,
  enabled boolean not null default false,

  -- Non-secret configuration only, enforced by the trigger below.
  config jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint integration_settings_provider_known check (provider in ('apple', 'google')),
  constraint integration_settings_config_is_object check (jsonb_typeof(config) = 'object')
);

create unique index integration_settings_org_provider_key
  on public.integration_settings (organization_id, provider);

create trigger integration_settings_set_updated_at
  before update on public.integration_settings
  for each row execute function public.set_updated_at();

-- A CHECK constraint cannot contain a subquery, so the secret-key guard is a
-- trigger. It is a backstop for the Zod schema, not a replacement for it: two
-- independent layers means a new write path cannot quietly bypass the rule.
create or replace function public.integration_settings_reject_secrets()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  offending_key text;
begin
  select key
  into offending_key
  from jsonb_object_keys(new.config) as key
  where key ~* '(secret|password|private|token|certificate|credential|apikey|api_key)'
  limit 1;

  if offending_key is not null then
    raise exception
      'integration_settings.config must not contain credentials (offending key: %). Use server environment variables.',
      offending_key
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger integration_settings_reject_secrets
  before insert or update on public.integration_settings
  for each row execute function public.integration_settings_reject_secrets();

comment on table public.integration_settings is
  'Per-organization, non-secret wallet provider configuration (enabled flag, class suffixes). Credentials live in server environment variables only; a trigger rejects credential-shaped keys.';
