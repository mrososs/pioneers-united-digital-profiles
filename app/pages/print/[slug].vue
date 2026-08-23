<script setup lang="ts">
import type { PublicProfile } from '#shared/types/profile'
import { toLocaleCode } from '#shared/constants/locales'

/**
 * Print-only rendering of a published profile: `/en/print/{slug}`,
 * `/ar/print/{slug}`.
 *
 * `print` is a leading STATIC segment, not `[slug]/print` — a
 * `pages/[slug]/print.vue` file next to `pages/[slug].vue` is Nuxt's
 * convention for a nested child route of `[slug].vue`, which has no
 * `<NuxtPage />` outlet, so the child would silently never render. See
 * `profilePrintUrl` in server/utils/urls.ts for the same note.
 *
 * This is what `server/services/pdf/pdf.service.ts` points a headless browser
 * at to produce the downloadable PDF — see that file for why a real browser
 * renders it rather than a PDF library. It is reachable like any other public
 * route (the data behind it is already public), but it is not linked from
 * anywhere a visitor would land on directly, and `noindex` keeps it out of
 * search results.
 *
 * Deliberately not the interactive `[slug].vue` page: that page has motion, a
 * sticky panel and buttons (wallet, QR downloads, share) that have no meaning
 * on paper. `ProfilePrintView` is a plain, static layout built for this one
 * purpose instead of a print stylesheet fighting the interactive one.
 */
definePageMeta({
  layout: 'print',
})

const route = useRoute()
const { locale } = useI18n()

const slug = computed(() => String(route.params.slug ?? ''))
const currentLocale = computed(() => toLocaleCode(locale.value))

const { data: profile } = await useFetch<PublicProfile>(
  () => `/api/public/profiles/${slug.value}`,
  {
    query: { locale: currentLocale },
    key: () => `print-profile:${slug.value}:${currentLocale.value}`,
  },
)

if (!profile.value) {
  throw createError({ statusCode: 404, statusMessage: 'not_found', fatal: true })
}

useSeoMeta({
  title: () => profile.value?.name ?? '',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <ProfilePrintView
    v-if="profile"
    :profile="profile"
  />
</template>
