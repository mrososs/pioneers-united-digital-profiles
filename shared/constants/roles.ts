/**
 * Deliberately small permission model: two roles, checked server-side only.
 *
 * `admin`       — manages profiles and content within its own organization.
 * `super_admin` — everything an admin can do, plus organization settings,
 *                 integrations and administrator management, across all
 *                 organizations.
 *
 * Roles live in `public.admin_users` and are read through SECURITY DEFINER
 * helpers used by Row Level Security. A role sent from the browser is never
 * trusted (see server/utils/auth.ts).
 */

export const APP_ROLES = ['admin', 'super_admin'] as const
export type AppRole = typeof APP_ROLES[number]

/** Capabilities are derived from the role — never stored, never client-supplied. */
export const ROLE_CAPABILITIES = {
  admin: [
    'profiles:read',
    'profiles:write',
    'profiles:publish',
    'wallet:generate',
    'branding:read',
  ],
  super_admin: [
    'profiles:read',
    'profiles:write',
    'profiles:publish',
    'profiles:delete',
    'wallet:generate',
    'branding:read',
    'branding:write',
    'organization:write',
    'integrations:write',
    'admins:manage',
  ],
} as const satisfies Record<AppRole, readonly string[]>

export type Capability = typeof ROLE_CAPABILITIES[AppRole][number]

export function roleHasCapability(role: AppRole, capability: Capability): boolean {
  return (ROLE_CAPABILITIES[role] as readonly string[]).includes(capability)
}
