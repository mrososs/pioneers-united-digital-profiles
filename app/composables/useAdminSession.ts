import type { Capability } from '#shared/constants/roles'
import type { AdminSession } from '#shared/types/session'

/**
 * The dashboard's view of who is signed in.
 *
 * The session is resolved by `/api/admin/session`, which reads the role from the
 * database. The client NEVER derives a role from the Supabase user object: user
 * metadata is writable by the user, so a role claim there would be self-assigned.
 *
 * `can()` decides what to RENDER. It is not a security boundary — every mutating route
 * re-checks the same capability on the server. Hiding a button and refusing the request
 * are two separate mechanisms, and only the second one protects anything.
 *
 * `useState` keys the value into the Nuxt payload so an SSR-rendered dashboard does not
 * re-request the session on hydration.
 *
 * `refresh` uses `useRequestFetch()`, not the ambient `$fetch`: on the server, the global
 * `$fetch` does not forward the incoming request's cookies, so a call from middleware
 * during SSR would reach `/api/admin/session` looking anonymous, send an authenticated
 * visitor to the login screen, and then bounce back once client-side hydration re-ran the
 * check with the browser's real cookies — a login flash plus a hydration mismatch on every
 * hard navigation into the dashboard. `useRequestFetch()` forwards those headers.
 */
export function useAdminSession() {
  const session = useState<AdminSession | null>('admin-session', () => null)
  const pending = useState<boolean>('admin-session-pending', () => false)
  const requestFetch = useRequestFetch()

  async function refresh(): Promise<AdminSession | null> {
    pending.value = true
    try {
      const response = await requestFetch<{ session: AdminSession | null }>('/api/admin/session')
      session.value = response.session
      return response.session
    }
    catch {
      // A failed lookup means "not authorised", never "assume the last known role".
      session.value = null
      return null
    }
    finally {
      pending.value = false
    }
  }

  /** Fetches once per session; subsequent callers reuse the cached value. */
  async function ensure(): Promise<AdminSession | null> {
    if (session.value) return session.value
    return refresh()
  }

  const isAuthenticated = computed(() => session.value !== null)
  const isSuperAdmin = computed(() => session.value?.role === 'super_admin')

  function can(capability: Capability): boolean {
    return session.value?.capabilities.includes(capability) ?? false
  }

  return {
    session: readonly(session),
    pending: readonly(pending),
    isAuthenticated,
    isSuperAdmin,
    can,
    ensure,
    refresh,
  }
}
