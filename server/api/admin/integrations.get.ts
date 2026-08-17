import { listIntegrations } from '../../services/organization.service'
import { walletProviderSummary } from '../../services/wallet/wallet.service'
import { requireAdmin } from '../../utils/auth'

/**
 * GET /api/admin/integrations
 *
 * Combines the stored per-organization settings with the server's credential status,
 * so the screen can distinguish "switched off" from "cannot be switched on yet".
 *
 * `providerStatus` carries the NAMES of missing environment variables and no values.
 */
export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)

  setHeader(event, 'cache-control', 'no-store')

  return {
    integrations: await listIntegrations(event, session),
    providerStatus: walletProviderSummary(),
  }
})
