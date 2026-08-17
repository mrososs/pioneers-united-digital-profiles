import type { WalletAvailability } from '#shared/types/wallet'
import { walletProviderSummary } from '../../services/wallet/wallet.service'

/**
 * GET /api/public/wallet-status
 *
 * Whether each wallet provider is usable, for an anonymous visitor.
 *
 * Returns booleans only. The administrator endpoint additionally reports WHICH environment
 * variables are missing; publishing that here would tell an attacker exactly how the
 * server is configured, for no benefit to the visitor.
 *
 * Cached: the answer changes only when the deployment's environment changes.
 */
export default defineEventHandler((event): WalletAvailability => {
  const summary = walletProviderSummary()

  setHeader(event, 'cache-control', 'public, max-age=300')

  return {
    apple: summary.apple.configured,
    google: summary.google.configured,
  }
})
