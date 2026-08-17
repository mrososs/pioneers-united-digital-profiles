import { getProfileCounts, listProfilesForAdmin } from '../../services/profile.service'
import { walletProviderSummary } from '../../services/wallet/wallet.service'
import { requireAdmin } from '../../utils/auth'

/**
 * GET /api/admin/overview
 *
 * Everything the dashboard landing page needs, in one round trip: profile counts, the
 * five most recently touched profiles, and whether each wallet provider is configured.
 */
export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)

  const [counts, recent] = await Promise.all([
    getProfileCounts(event, session),
    listProfilesForAdmin(event, session, { page: 1, perPage: 5 }),
  ])

  setHeader(event, 'cache-control', 'no-store')

  return {
    counts,
    recentProfiles: recent.items,
    // Names of missing environment variables only — never their values.
    wallet: walletProviderSummary(),
  }
})
