import type { H3Event } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { AppRole, Capability } from '#shared/constants/roles'
import { ROLE_CAPABILITIES, roleHasCapability } from '#shared/constants/roles'
import type { AdminSession } from '#shared/types/session'
import { forbidden, unauthenticated } from './errors'
import { requestLogger } from './logger'

/**
 * Server-side authorization. This module is the only place that decides whether a
 * caller is an administrator.
 *
 * THREE RULES
 *
 *   1. Being authenticated is not being an administrator. A Supabase project can
 *      have any number of signed-in users; only a row in `public.admin_users` with
 *      `is_active = true` grants dashboard access.
 *
 *   2. The role is read from the database on every request, never from the JWT.
 *      `raw_user_meta_data` is writable by the user through the Auth API, so a role
 *      claim there would be self-assigned. `app_metadata` is not user-writable, but
 *      it is also not the source of truth here, and keeping one source avoids the
 *      class of bug where the two disagree after a role change.
 *
 *   3. The client is never trusted with an authorization decision.
 *      `app/middleware/admin-auth.ts` only decides what to *render*; every mutating
 *      route calls `requireAdmin`/`requireCapability` itself.
 *
 * The lookup uses the service-role client deliberately: `admin_users` is protected
 * by RLS that permits reading one's own row, and using the elevated client keeps
 * this check independent of that policy so the two layers cannot fail together.
 */

const SESSION_CONTEXT_KEY = '__adminSession'

interface AuthContext {
  [SESSION_CONTEXT_KEY]?: AdminSession | null
}

/**
 * Resolves the administrator session, or null when the caller is anonymous or not
 * an active administrator. Memoised per request.
 */
export async function getAdminSession(event: H3Event): Promise<AdminSession | null> {
  const context = event.context as AuthContext

  if (SESSION_CONTEXT_KEY in context) {
    return context[SESSION_CONTEXT_KEY] ?? null
  }

  const user = await serverSupabaseUser(event)

  if (!user?.sub) {
    context[SESSION_CONTEXT_KEY] = null
    return null
  }

  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('admin_users')
    .select('id, organization_id, role, full_name, is_active')
    .eq('id', user.sub)
    .maybeSingle()

  if (error) {
    // A failed lookup must deny access, never fall through to a default role.
    requestLogger(event).error('admin_session_lookup_failed', { detail: error, userId: user.sub })
    context[SESSION_CONTEXT_KEY] = null
    return null
  }

  if (!data || !data.is_active) {
    context[SESSION_CONTEXT_KEY] = null
    return null
  }

  const role: AppRole = data.role
  const session: AdminSession = {
    userId: data.id,
    email: typeof user.email === 'string' ? user.email : '',
    fullName: data.full_name,
    role,
    organizationId: data.organization_id,
    capabilities: [...ROLE_CAPABILITIES[role]] as Capability[],
  }

  context[SESSION_CONTEXT_KEY] = session
  return session
}

/** Throws 401 for anonymous callers, 403 for signed-in non-administrators. */
export async function requireAdmin(event: H3Event): Promise<AdminSession> {
  const session = await getAdminSession(event)

  if (session) return session

  const user = await serverSupabaseUser(event)
  throw user?.sub ? forbidden(event) : unauthenticated(event)
}

/** Throws unless the caller's role carries `capability`. */
export async function requireCapability(event: H3Event, capability: Capability): Promise<AdminSession> {
  const session = await requireAdmin(event)

  if (!roleHasCapability(session.role, capability)) {
    throw forbidden(event)
  }

  return session
}

/**
 * Guards tenancy on a record the caller named. An admin may only touch its own
 * organization; a super admin may touch any.
 *
 * This exists so a handler cannot forget the check by simply trusting an
 * `organizationId` that arrived in the request body.
 */
export function assertCanManageOrganization(
  event: H3Event,
  session: AdminSession,
  organizationId: string,
): void {
  if (session.role === 'super_admin') return
  if (session.organizationId === organizationId) return

  throw forbidden(event)
}
