import type { LocaleCode } from '#shared/constants/locales'
import type { WalletProvider } from '#shared/constants/wallet'
import type { WalletPassArtifact, WalletProviderStatus } from '#shared/types/wallet'

/**
 * The contract every wallet provider implements.
 *
 * WHY AN INTERFACE RATHER THAN TWO AD-HOC MODULES
 *   Apple and Google have nothing in common at the protocol level: one signs a ZIP
 *   of JSON and PNGs with a PKCS#7 detached signature, the other authenticates a
 *   service account over OAuth2 and returns a JWT-signed link. Forcing both behind
 *   `WalletProviderAdapter` means the rest of the application — the dashboard, the
 *   public "Add to wallet" buttons, the bookkeeping repository — depends only on
 *   this shape. Implementing the real signing later touches one file each and
 *   nothing else, which is the property the bootstrap needs to guarantee.
 */

/**
 * Everything a provider needs about a profile, already locale-resolved. Providers
 * never query the database themselves: that keeps them pure, testable and unable to
 * accidentally read an unpublished profile.
 */
export interface WalletPassContext {
  profileId: string
  slug: string
  locale: LocaleCode
  name: string
  jobTitle: string | null
  organizationName: string
  email: string | null
  phone: string | null
  /** Canonical public profile URL. This is what the pass links back to. */
  profileUrl: string
  /** Absolute URL of the profile photograph, when there is one. */
  photoUrl: string | null
  /** Resolved brand colours, so a pass matches the profile it came from. */
  brand: {
    backgroundColor: string
    foregroundColor: string
    labelColor: string
  }
  /** Stable provider-side id from a previous generation, when regenerating. */
  existingExternalId: string | null
}

/** Apple pass signing material, read from server-only environment variables. */
export interface AppleWalletConfig {
  teamIdentifier: string
  passTypeIdentifier: string
  certificateBase64: string
  certificatePassword: string
  wwdrCertificateBase64: string
}

/** Google Wallet issuer and service-account credentials. */
export interface GoogleWalletConfig {
  issuerId: string
  classSuffix: string
  serviceAccountEmail: string
  serviceAccountPrivateKey: string
}

/**
 * Config is injected as getters rather than read from `useRuntimeConfig()` inside
 * the adapters. That keeps the adapters unit-testable without a Nitro context, and
 * it makes the set of secrets each provider can reach explicit and auditable.
 */
export interface WalletPassAdapterDeps {
  appleConfig: () => AppleWalletConfig
  googleConfig: () => GoogleWalletConfig
}

export interface WalletProviderAdapter {
  readonly provider: WalletProvider

  /**
   * Whether the server has the credentials this provider needs. Called before any
   * generation attempt so the UI can disable the action instead of failing.
   */
  status(): WalletProviderStatus

  /**
   * Produces the pass. Only called when `status().configured` is true.
   *
   * Throws on provider failure; the caller records the failure against the
   * wallet_passes row and returns a sanitised error to the client.
   */
  generate(context: WalletPassContext): Promise<WalletPassArtifact>
}

/**
 * Reports which environment variables of a credential set are absent.
 *
 * `envKeyMap` maps the environment variable name (what an operator must set) to the
 * config field it lands in. Only presence is inspected — a value is never returned,
 * compared or logged, so this cannot become a credential oracle.
 */
export function missingCredentialKeys<TConfig extends object>(
  config: TConfig,
  envKeyMap: Readonly<Record<string, keyof TConfig>>,
): string[] {
  const missing: string[] = []

  for (const envKey of Object.keys(envKeyMap)) {
    const configKey = envKeyMap[envKey]
    const value = configKey === undefined ? undefined : config[configKey]

    if (typeof value !== 'string' || value.trim().length === 0) {
      missing.push(envKey)
    }
  }

  return missing
}
