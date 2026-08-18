-- =============================================================================
-- 20260818123735_grant_service_role_privileges
--
-- `service_role` bypasses RLS, but that is a separate axis from table-level
-- privileges — Postgres still checks GRANTs first. The default ACL captured
-- when the migrations in this project ran gives `service_role` only
-- DELETE/TRUNCATE/REFERENCES/TRIGGER on a newly created table, identical to
-- `anon` and `authenticated`. Migration 000600 explicitly granted full CRUD to
-- `authenticated` but never granted anything to `service_role`, so every
-- `serverSupabaseServiceRole()` read or write in server/ (admin session
-- resolution, profile CRUD, wallet bookkeeping, integration settings) fails
-- with "permission denied for table ..." — confirmed against both the local
-- stack and the hosted project, since 000600 already applied to both.
--
-- Fixing forward with a new migration rather than editing 000600: it has
-- already run everywhere, and a migration's timestamp is its applied order.
-- =============================================================================

grant select, insert, update, delete on public.organizations to service_role;
grant select, insert, update, delete on public.organization_branding to service_role;
grant select, insert, update, delete on public.admin_users to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.profile_links to service_role;
grant select, insert, update, delete on public.wallet_passes to service_role;
grant select, insert, update, delete on public.integration_settings to service_role;
