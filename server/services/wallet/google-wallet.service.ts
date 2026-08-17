import type { WalletPassArtifact, WalletProviderStatus } from '#shared/types/wallet'
import type { GoogleWalletConfig, WalletPassAdapterDeps, WalletPassContext, WalletProviderAdapter } from './types'
import { missingCredentialKeys } from './types'

/**
 * Google Wallet integration boundary.
 *
 * STATUS: not implemented. No Google Wallet issuer or service account has been
 * supplied. `status()` reports which environment variables are missing.
 *
 * WHAT IMPLEMENTING IT INVOLVES (all inside this file)
 *
 *   1. Generic Pass *class* — created once per deployment, not per profile. It
 *      carries the template: which fields exist, the logo, the hero image, the
 *      colour. Created/updated via
 *      `POST/PUT https://walletobjects.googleapis.com/walletobjects/v1/genericClass`
 *      with id `{issuerId}.{classSuffix}`. Idempotent, so it is safe to ensure on
 *      first use.
 *
 *   2. Generic Pass *object* — one per profile, id `{issuerId}.{profileId}`, holding
 *      the actual values (name, job title, organization) and a `barcode` of type
 *      QR_CODE whose value is `context.profileUrl`.
 *
 *   3. "Add to Google Wallet" link — a JWT with claims
 *      `{ iss: serviceAccountEmail, aud: 'google', typ: 'savetowallet',
 *         payload: { genericObjects: [...] } }`
 *      signed RS256 with the service-account private key, appended to
 *      `https://pay.google.com/gp/v/save/<jwt>`. That URL is the artifact returned
 *      to the client — Google never receives our credentials from the browser.
 *
 *   4. Updates are a PATCH on the object id. Because the id is derived from
 *      `profileId`, a profile edit can push a live update to passes already saved,
 *      which is why `external_id` is persisted in `wallet_passes`.
 *
 * SECURITY CONSTRAINTS THAT MUST HOLD
 *   * The service-account private key exists only as a server-side environment
 *     variable. It is never stored in the database (`integration_settings` has a
 *     trigger that rejects credential-shaped keys), never in Storage, never logged.
 *   * JWT signing happens in Nitro. The browser receives only the finished save
 *     URL, which is scoped to one pass object and carries no reusable credential.
 *   * Never commit the service-account JSON. `.gitignore` blocks
 *     `*-service-account.json`.
 */

const REQUIRED_ENV_KEYS: Readonly<Record<string, keyof GoogleWalletConfig>> = {
  NUXT_WALLET_GOOGLE_ISSUER_ID: 'issuerId',
  NUXT_WALLET_GOOGLE_CLASS_SUFFIX: 'classSuffix',
  NUXT_WALLET_GOOGLE_SERVICE_ACCOUNT_EMAIL: 'serviceAccountEmail',
  NUXT_WALLET_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: 'serviceAccountPrivateKey',
}

export function createGoogleWalletAdapter(deps: WalletPassAdapterDeps): WalletProviderAdapter {
  /** Presence only; credential values never leave the server. */
  function status(): WalletProviderStatus {
    const missing = missingCredentialKeys(deps.googleConfig(), REQUIRED_ENV_KEYS)

    return {
      provider: 'google',
      configured: missing.length === 0,
      missingConfiguration: missing,
    }
  }

  async function generate(_context: WalletPassContext): Promise<WalletPassArtifact> {
    return Promise.reject(
      new Error('Google Wallet pass generation is not implemented: awaiting Google Wallet issuer and service account.'),
    )
  }

  return {
    provider: 'google',
    status,
    generate,
  }
}
