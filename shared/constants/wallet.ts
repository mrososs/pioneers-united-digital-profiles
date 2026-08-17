/**
 * Wallet domain constants shared by the dashboard UI and the server-side
 * providers. Credentials themselves never appear here — see docs/wallet.md.
 */

export const WALLET_PROVIDERS = ['apple', 'google'] as const
export type WalletProvider = typeof WALLET_PROVIDERS[number]

export const WALLET_PASS_STATUSES = ['pending', 'active', 'revoked', 'failed'] as const
export type WalletPassStatus = typeof WALLET_PASS_STATUSES[number]

export const WALLET_PROVIDER_LABEL: Record<WalletProvider, string> = {
  apple: 'Apple Wallet',
  google: 'Google Wallet',
}

export const APPLE_PKPASS_MIME_TYPE = 'application/vnd.apple.pkpass'

export function isWalletProvider(value: unknown): value is WalletProvider {
  return typeof value === 'string' && (WALLET_PROVIDERS as readonly string[]).includes(value)
}
