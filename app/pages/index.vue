<script setup lang="ts">
/**
 * Public landing page (/en, /ar).
 *
 * A branded placeholder by design: this deployment's product is the individual profiles,
 * and the marketing story lives on pioneersunited.com. The final visual treatment arrives
 * with the design system — the structure here exists to verify routing, i18n, RTL and the
 * token system end to end.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()

const exampleUrl = computed(() => {
  const origin = config.public.siteUrl.replace(/\/+$/, '')
  return `${origin}${localePath('/sample-executive')}`
})

useSeoMeta({
  title: () => t('home.title'),
  description: () => t('home.description'),
  ogTitle: () => t('home.title'),
  ogDescription: () => t('home.description'),
  ogType: 'website',
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12 sm:py-20">
    <div class="flex flex-col gap-3">
      <p class="text-xs font-medium tracking-wide text-accent uppercase">
        {{ t('home.eyebrow') }}
      </p>

      <h1 class="text-3xl font-semibold text-balance text-foreground sm:text-4xl">
        {{ t('home.title') }}
      </h1>

      <p class="text-base text-pretty text-muted-fg">
        {{ t('home.description') }}
      </p>
    </div>

    <AppCard>
      <p class="text-sm text-muted-fg">
        {{ t('home.publicNote', { example: '' }) }}
      </p>
      <p
        class="mt-2 font-mono text-xs break-all text-foreground"
        dir="ltr"
      >
        {{ exampleUrl }}
      </p>
    </AppCard>

    <div class="flex flex-wrap gap-3">
      <AppButton
        :to="localePath('/admin')"
        variant="secondary"
      >
        {{ t('home.adminCta') }}
      </AppButton>

      <AppButton
        href="https://pioneersunited.com"
        variant="ghost"
      >
        {{ t('home.corporateCta') }}
      </AppButton>
    </div>
  </div>
</template>
