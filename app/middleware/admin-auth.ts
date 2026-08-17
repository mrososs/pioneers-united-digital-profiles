/**
 * Route middleware for the dashboard.
 *
 * WHAT THIS IS FOR
 *   Redirecting an unauthorised visitor to the login screen instead of flashing an empty
 *   dashboard at them. It is a NAVIGATION concern.
 *
 * WHAT THIS IS NOT
 *   Authorization. It runs on the client for client-side navigations, where it can be
 *   bypassed entirely. Nothing depends on it for safety:
 *
 *     * every admin API route calls requireAdmin()/requireCapability() server-side;
 *     * Row Level Security independently confines every query.
 *
 *   Deleting this file would make the dashboard ugly, not insecure. That is the intended
 *   division of responsibility — see server/CLAUDE.md.
 *
 * The session comes from /api/admin/session, which reads the role from the database, so
 * even the rendering decision is not based on a client-side claim.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const localePath = useLocalePath()
  const { ensure } = useAdminSession()

  const session = await ensure()

  if (session) return

  const loginPath = localePath('/admin/login')

  // Guard against a redirect loop if the login route ever gains this middleware.
  if (to.path === loginPath) return

  return navigateTo({
    path: loginPath,
    // `redirect` is consumed by the login page, which validates it against an
    // allow-list before navigating — an unchecked value here is an open-redirect.
    query: { redirect: to.fullPath },
  })
})
