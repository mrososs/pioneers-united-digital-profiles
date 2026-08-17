import { getAdminSession } from '../../utils/auth'

/**
 * GET /api/admin/session
 *
 * The authoritative answer to "who am I and what may I do".
 *
 * `app/middleware/admin-auth.ts` calls this to decide whether to render the
 * dashboard, and the returned capabilities drive which controls are shown. That is a
 * presentation decision only — every mutating route re-checks the same capability
 * server-side, so a tampered client can hide or reveal buttons and change nothing.
 *
 * Returns 200 with `{ session: null }` rather than 401 for an anonymous caller: the
 * middleware needs to distinguish "not signed in" from "request failed", and a 401
 * here would be indistinguishable from an expired token on a transport error.
 */
export default defineEventHandler(async (event) => {
  const session = await getAdminSession(event)

  setHeader(event, 'cache-control', 'no-store')

  return { session }
})
