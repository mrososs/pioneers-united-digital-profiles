/**
 * Keeps an already-signed-in administrator off the login screen.
 *
 * Purely a convenience: landing on a login form while authenticated is confusing, and the
 * common cause is a bookmarked /admin/login.
 */
export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()
  const { ensure } = useAdminSession()

  const session = await ensure()

  if (session) {
    return navigateTo(localePath('/admin'))
  }
})
