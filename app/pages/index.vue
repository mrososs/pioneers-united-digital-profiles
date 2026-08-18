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
  // `URL` rather than trimming trailing slashes by hand — it normalises the
  // origin whether the configured value ends in a slash or not.
  try {
    return new URL(localePath('/sample-executive'), config.public.siteUrl).toString()
  }
  catch {
    return localePath('/sample-executive')
  }
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
  <div class="mx-auto flex w-full max-w-profile-wide flex-col gap-10 px-5 py-14 lg:px-10 lg:py-24">
    <div
      v-reveal.group.now="{ stagger: 0.08 }"
      class="flex flex-col gap-4"
    >
      <p class="pu-eyebrow text-accent">
        {{ t('home.eyebrow') }}
      </p>

      <span
        class="pu-rule"
        style="--pu-rule-w: 56px"
        aria-hidden="true"
      />

      <h1 class="max-w-[18ch] text-4xl font-semibold tracking-display text-balance text-heading lg:text-5xl">
        {{ t('home.title') }}
      </h1>

      <p class="max-w-[58ch] text-md text-pretty text-body">
        {{ t('home.description') }}
      </p>
    </div>

    <AppCard v-reveal>
      <p class="pu-label-caps text-muted-fg">
        {{ t('home.publicNote', { example: '' }) }}
      </p>
      <p
        class="pu-mono mt-2.5 text-sm break-all text-heading"
        dir="ltr"
      >
        {{ exampleUrl }}
      </p>
    </AppCard>

    <div
      v-reveal
      class="flex flex-wrap gap-3"
    >
      <AppButton
        :to="localePath('/admin')"
        variant="secondary"
      >
        <AppIcon
          name="layout-dashboard"
          :size="17"
        />
        {{ t('home.adminCta') }}
      </AppButton>

      <AppButton
        href="https://pioneersunited.com"
        variant="ghost"
      >
        {{ t('home.corporateCta') }}
        <AppIcon
          name="arrow-up-right"
          :size="17"
        />
      </AppButton>
    </div>
  </div>
</template>
