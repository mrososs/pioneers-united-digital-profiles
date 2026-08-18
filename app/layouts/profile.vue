<script setup lang="ts">
/**
 * Layout for a public Digital Profile.
 *
 * WHY THIS EXISTS SEPARATELY FROM `default`
 *   The design system puts the brand mark and the language switch on the navy
 *   hero itself, not in a bar above it. A shared white header would break the
 *   single-surface reading the hero is built around, so the profile route uses
 *   this layout and `ProfileHero` carries the chrome. `default` keeps its header
 *   for the landing page, which has no hero to put it on.
 *
 * What this contributes is only what a hero cannot: the skip link, and the mono
 * URL footer that closes the page.
 *
 * `min-h-dvh` rather than `min-h-screen` — mobile browser chrome makes `vh`
 * wrong, and this page is opened on a phone more often than not.
 */
const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-background">
    <a
      href="#main"
      class="pu-skip-link"
    >
      {{ t('common.actions.skipToContent') }}
    </a>

    <main
      id="main"
      class="flex-1"
    >
      <slot />
    </main>

    <PublicFooter />
  </div>
</template>
