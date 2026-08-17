import type { AppRole, Capability } from '#shared/constants/roles'

/**
 * The authenticated administrator, as resolved by the server.
 *
 * This is the only role information the client may act on, and it is always
 * derived from `public.admin_users` on the server — never from a cookie, a
 * header or the JWT's user metadata, all of which the user can influence.
 */
export interface AdminSession {
  userId: string
  email: string
  fullName: string | null
  role: AppRole
  organizationId: string
  capabilities: Capability[]
}
