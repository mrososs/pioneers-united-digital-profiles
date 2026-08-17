<script setup lang="ts">
/**
 * Public layout.
 *
 * Deliberately minimal chrome: a public Digital Profile is a single-purpose page reached
 * from a QR code or a shared link, and navigation the visitor did not ask for competes
 * with the one action that matters (saving the contact).
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
      {{ t('common.actions.back') }}
    </a>

    <header class="border-b border-border bg-surface">
      <div class="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
        <NuxtLink
          :to="localePath('/')"
          class="flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
