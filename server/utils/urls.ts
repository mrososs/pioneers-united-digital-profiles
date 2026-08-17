import type { LocaleCode } from '#shared/constants/locales'
import { LOCALE_CODES } from '#shared/constants/locales'

/**
 * Canonical URL construction.
 *
 * Every externally visible URL — QR payload, vCard `URL` property, Open Graph
 * `og:url`, hreflang alternate, wallet pass link — is built here from
 * `NUXT_PUBLIC_SITE_URL`. Deriving them from the incoming request Host instead
 * would let a `Host:` header rewrite the QR code of a printed business card, so
 * the origin is configuration, never request data.
 */

/** Normalised origin with no trailing slash. */
export function siteOrigin(): string {
  const configured = useRuntimeConfig().public.siteUrl
  return configured.replace(/\/+$/, '')
}

export function profilePath(locale: LocaleCode, slug: string): string {
  return `/${locale}/${slug}`
}

export function profileUrl(locale: LocaleCode, slug: string): string {
  return `${siteOrigin()}${profilePath(locale, slug)}`
}

/** Absolute URLs for both locales, used for hreflang and the language switcher. */
export function profileAlternateUrls(slug: string): Record<LocaleCode, string> {
  const origin = siteOrigin()
  return LOCALE_CODES.reduce((accumulator, locale) => {
    accumulator[locale] = `${origin}${profilePath(locale, slug)}`
    return accumulator
  }, {} as Record<LocaleCode, string>)
}

export function vcardUrl(slug: string): string {
  return `${siteOrigin()}/api/profiles/${slug}/vcard`
}

export function qrUrl(slug: string, format: 'svg' | 'png' = 'svg'): string {
  return `${siteOrigin()}/api/profiles/${slug}/qr.${format}`
}

/**
 * Absolute URL of a public storage object.
 *
 * Built from the configured Supabase URL rather than stored in the database, so
 * the storage origin (or a CDN in front of it) can change without a migration.
 */
export function publicStorageUrl(bucket: string, objectKey: string | null): string | null {
  if (!objectKey) return null

  // `public.supabase.url` is typed loosely by the module (it is resolved from the
  // environment at build time), so it is coerced rather than trusted to be a string.
  const base = String(useRuntimeConfig().public.supabase.url ?? '').replace(/\/+$/, '')
  if (base.length === 0) return null
  const encoded = objectKey.split('/').map(encodeURIComponent).join('/')

  return `${base}/storage/v1/object/public/${bucket}/${encoded}`
}
