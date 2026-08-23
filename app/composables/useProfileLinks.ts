import type { LocaleCode } from '#shared/constants/locales'
import type { PublicProfile } from '#shared/types/profile'

/**
 * Derives the outward-facing URLs of a profile: the shareable link, the vCard
 * download, the QR endpoints and the wallet endpoints.
 *
 * Centralised so that a route rename is one edit rather than a hunt through templates,
 * and so the QR shown on screen and the QR handed to a printer are provably the same
 * URL.
 */
export function useProfileLinks(profile: MaybeRefOrGetter<PublicProfile | null | undefined>) {
  const { locale } = useI18n()

  const resolved = computed(() => toValue(profile))
  const slug = computed(() => resolved.value?.slug ?? null)
  const currentLocale = computed(() => locale.value as LocaleCode)

  /** Absolute canonical URL — what the QR encodes and what "copy link" copies. */
  const shareUrl = computed(() => resolved.value?.canonicalUrl ?? null)

  const vcardUrl = computed(() =>
    slug.value ? `/api/profiles/${slug.value}/vcard?locale=${currentLocale.value}` : null,
  )

  const pdfUrl = computed(() =>
    slug.value ? `/api/profiles/${slug.value}/pdf?locale=${currentLocale.value}` : null,
  )

  const qrSvgUrl = computed(() =>
    slug.value ? `/api/profiles/${slug.value}/qr?format=svg&locale=${currentLocale.value}` : null,
  )

  const qrPngDownloadUrl = computed(() =>
    slug.value
      ? `/api/profiles/${slug.value}/qr?format=png&size=1024&locale=${currentLocale.value}&download=1`
      : null,
  )

  const qrSvgDownloadUrl = computed(() =>
    slug.value ? `/api/profiles/${slug.value}/qr?format=svg&locale=${currentLocale.value}&download=1` : null,
  )

  const appleWalletUrl = computed(() =>
    slug.value ? `/api/wallet/apple/${slug.value}?locale=${currentLocale.value}` : null,
  )

  const googleWalletUrl = computed(() =>
    slug.value ? `/api/wallet/google/${slug.value}?locale=${currentLocale.value}` : null,
  )

  /**
   * `tel:` / `mailto:` / WhatsApp targets.
   *
   * The phone number is stored in E.164 and validated by both Zod and a database
   * CHECK, so it is safe to interpolate. WhatsApp's wa.me form wants the number with
   * no leading `+`.
   */
  const telHref = computed(() => (resolved.value?.phone ? `tel:${resolved.value.phone}` : null))
  const mailtoHref = computed(() => (resolved.value?.email ? `mailto:${resolved.value.email}` : null))
  const whatsappHref = computed(() =>
    resolved.value?.whatsapp ? `https://wa.me/${resolved.value.whatsapp.replace(/^\+/, '')}` : null,
  )

  return {
    shareUrl,
    vcardUrl,
    pdfUrl,
    qrSvgUrl,
    qrPngDownloadUrl,
    qrSvgDownloadUrl,
    appleWalletUrl,
    googleWalletUrl,
    telHref,
    mailtoHref,
    whatsappHref,
  }
}
