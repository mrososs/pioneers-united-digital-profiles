<script setup lang="ts">
/**
 * Public layout.
 *
 * Deliberately minimal chrome: a public surface reached from a QR code or a shared
 * link is single-purpose, and navigation the visitor did not ask for competes
 * with the one action that matters.
 *
 * A Digital Profile does not use this layout — it uses `profile`, because the
 * design system puts the brand mark and the language switch on the navy hero
 * rather than in a bar above it. This layout serves the landing page, which has
 * no hero to carry them.
 *
 * The skip link is first in the DOM so keyboard and screen-reader users can jump straight
 * to the content.
 */
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-background">
    <a
      href="#main"
      class="pu-skip-link"
    >
      {{ t('common.actions.skipToContent') }}
    </a>

    <header class="border-b border-border bg-surface">
      <div class="mx-auto flex max-w-profile-wide items-center justify-between gap-4 px-5 py-3.5 lg:px-10">
        <NuxtLink
          :to="localePath('/')"
          class="flex items-center gap-2 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <BrandLogo size="sm" />
          <span class="sr-only">{{ t('app.name') }}</span>
        </NuxtLink>

        <LocaleSwitcher />
      </div>
    </header>

    <main
      id="main"
      class="flex-1"
    >
      <slot />
    </main>

    <PublicFooter />
  </div>
</template>
