import type { WalletPassStatus, WalletProvider } from '#shared/constants/wallet'

/** A wallet pass record as surfaced to the dashboard. */
export interface WalletPass {
  id: string
  profileId: string
  provider: WalletProvider
  /** Provider-side identifier (Apple serialNumber / Google objectId). */
  externalId: string | null
  status: WalletPassStatus
  lastGeneratedAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

/** Whether a provider has enough server-side credentials to be usable. */
export interface WalletProviderStatus {
  provider: WalletProvider
  configured: boolean
  /** Names of the environment variables that are still missing. */
  missingConfiguration: string[]
}

/**
 * What a provider returns after generating a pass. Apple hands back a binary
 * .pkpass bundle; Google hands back a signed "Add to Google Wallet" URL. The
 * discriminated union keeps the two from being confused at a call site.
 */
export type WalletPassArtifact
  = | { kind: 'file', provider: 'apple', fileName: string, mimeType: string, body: Uint8Array, externalId: string }
    | { kind: 'link', provider: 'google', url: string, externalId: string }

/**
 * Administrator-facing summary. Includes the names of missing environment variables so an
 * operator knows what to provision. Never returned on a public route.
 */
export interface WalletProviderSummary {
  apple: WalletProviderStatus
  google: WalletProviderStatus
}

/**
 * Public-facing availability: a plain yes/no per provider.
 *
 * Deliberately narrower than WalletProviderSummary — an anonymous visitor needs to know
 * whether the button works, and nothing about the server's configuration. Enumerating
 * environment variable names to the world is free reconnaissance.
 */
export interface WalletAvailability {
  apple: boolean
  google: boolean
}
