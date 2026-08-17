import type { WalletProvider } from '#shared/constants/wallet'
import type { WalletProviderSummary } from '#shared/types/wallet'
import { createAppleWalletAdapter } from './apple-wallet.service'
import { createGoogleWalletAdapter } from './google-wallet.service'
import type { AppleWalletConfig, GoogleWalletConfig, WalletPassAdapterDeps, WalletProviderAdapter } from './types'

/**
 * Provider registry.
 *
 * The rest of the application asks this module for an adapter and never imports
 * `apple-wallet.service` or `google-wallet.service` directly. That is what keeps
 * provider-specific code isolated: adding a third wallet, or replacing one
 * implementation, is a change to this file plus one new adapter.
 */

/**
 * Reads the wallet credentials out of runtime config.
 *
 * `useRuntimeConfig()` here — not `process.env` — because Nitro resolves the
 * NUXT_WALLET_* variables into this shape at request time, including in a built
 * server where the values were not present at build time. The values stay inside
 * the adapter closures and are never returned to a caller.
 */
function adapterDeps(): WalletPassAdapterDeps {
  return {
    appleConfig: (): AppleWalletConfig => {
      const { apple } = useRuntimeConfig().wallet
      return {
        teamIdentifier: apple.teamIdentifier,
        passTypeIdentifier: apple.passTypeIdentifier,
        certificateBase64: apple.certificateBase64,
        certificatePassword: apple.certificatePassword,
        wwdrCertificateBase64: apple.wwdrCertificateBase64,
      }
    },
    googleConfig: (): GoogleWalletConfig => {
      const { google } = useRuntimeConfig().wallet
      return {
        issuerId: google.issuerId,
        classSuffix: google.classSuffix,
        serviceAccountEmail: google.serviceAccountEmail,
        serviceAccountPrivateKey: google.serviceAccountPrivateKey,
      }
    },
  }
}

export function walletAdapter(provider: WalletProvider): WalletProviderAdapter {
  const deps = adapterDeps()

  switch (provider) {
    case 'apple':
      return createAppleWalletAdapter(deps)
    case 'google':
      return createGoogleWalletAdapter(deps)
  }
}

/**
 * Configuration status for both providers.
 *
 * Safe to return to an authenticated administrator: it contains the NAMES of any
 * missing environment variables so an operator knows what to provision, and no
 * values. It is never exposed on a public route.
 */
export function walletProviderSummary(): WalletProviderSummary {
  return {
    apple: walletAdapter('apple').status(),
    google: walletAdapter('google').status(),
  }
}

/**
 * Truncated, single-line failure reason suitable for `wallet_passes.last_error`.
 *
 * Provider errors can embed request payloads; storing one verbatim risks persisting
 * a token into a table an administrator can read. Only the message is kept, capped,
 * and stripped of anything that looks like a bearer token or a PEM block.
 */
export function sanitiseProviderError(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'Unknown wallet provider error'

  return raw
    .replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, '[key]')
    .replace(/\b(?:Bearer|Basic)\s+[\w.\-/+=]+/gi, '[token]')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[jwt]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500)
}
