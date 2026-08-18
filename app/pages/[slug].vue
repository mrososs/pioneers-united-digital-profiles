<script setup lang="ts">
import type { PublicProfile } from '#shared/types/profile'
import type { WalletAvailability } from '#shared/types/wallet'
import { toLocaleCode } from '#shared/constants/locales'

/**
 * The public Digital Profile: /en/{slug} and /ar/{slug}.
 *
 * ONE PAGE FOR BOTH LOCALES AND BOTH PROFILE TYPES
 *   i18n routing generates the /en and /ar variants from this single file, so there is no
 *   duplicated Arabic page to keep in step. Individual and company profiles differ only in
 *   which blocks ProfileView renders.
 *
 * THE PAGE ORCHESTRATES, IT DOES NOT DECIDE
 *   It fetches, sets SEO metadata and hands the result to components. Locale resolution,
 *   the published-only rule and URL construction all happen server-side; the page never
 *   touches Supabase directly.
 *
 * `useSetI18nParams` is what makes the language switcher work on a dynamic route: without
 * it, switching locale on /en/sample-executive would lose the slug.
 */
definePageMeta({
  // Not `default`: the design system puts the brand mark and the language
  // switch on the navy hero rather than in a bar above it, so this route uses a
  // layout that contributes only the skip link and the mono URL footer.
  layout: 'profile',
})

const route = useRoute()
const { locale, t } = useI18n()

const slug = computed(() => String(route.params.slug ?? ''))
const currentLocale = computed(() => toLocaleCode(locale.value))

const setI18nParams = useSetI18nParams()

const { data: profile } = await useFetch<PublicProfile>(
  () => `/api/public/profiles/${slug.value}`,
  {
    query: { locale: currentLocale },
    // The response depends on both slug and locale, so both belong in the cache key.
    key: () => `public-profile:${slug.value}:${currentLocale.value}`,
  },
)

// A missing or unpublished profile is a 404 for the visitor, matching the API.
if (!profile.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'not_found',
    fatal: true,
  })
}

// Tell i18n the slug for every locale so hreflang and the switcher resolve correctly.
setI18nParams({
  en: { slug: slug.value },
  ar: { slug: slug.value },
})

/**
 * Wallet availability. Fetched separately and non-blockingly: whether Apple/Google are
 * configured is a server fact that must not delay the profile itself, and its absence
 * simply hides the wallet buttons.
 */
const { data: walletAvailability } = await useFetch<WalletAvailability | null>(
  '/api/public/wallet-status',
  { default: () => null },
)

const description = computed(() => {
  const current = profile.value
  if (!current) return ''

  if (current.bio) return current.bio.slice(0, 200)

  const role = current.jobTitle ? `${current.jobTitle} — ` : ''
  return `${role}${current.organization.name}`
})

const socialImage = computed(() => profile.value?.photoUrl ?? profile.value?.organization.logoUrl ?? undefined)

/**
 * SEO for a link that will be pasted into WhatsApp, LinkedIn, Messages and e-mail.
 * `og:title`/`og:description`/`og:image` are what those clients render in the preview
 * card, and `og:locale` plus the canonical URL keep the Arabic and English variants from
 * competing with each other in search results.
 */
useSeoMeta({
  title: () => profile.value?.name ?? t('profile.notFound.title'),
  description,
  ogTitle: () => profile.value?.name ?? '',
  ogDescription: description,
  ogType: 'profile',
  ogUrl: () => profile.value?.canonicalUrl,
  ogImage: socialImage,
  ogLocale: () => (currentLocale.value === 'ar' ? 'ar_SA' : 'en_US'),
  ogSiteName: () => t('app.name'),
  twitterCard: 'summary',
  twitterTitle: () => profile.value?.name ?? '',
  twitterDescription: description,
  twitterImage: socialImage,
  robots: 'index, follow',
})

useHead(() => ({
  link: profile.value
    ? [{ rel: 'canonical', href: profile.value.canonicalUrl }]
    : [],
}))
</script>

<template>
  <ProfileView
    v-if="profile"
    :profile="profile"
    :wallet-availability="walletAvailability"
  />
</template>
