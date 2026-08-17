<script setup lang="ts">
/**
 * Layout for the administrator sign-in screen.
 *
 * Separate from `admin` because it must render without a session — the admin layout
 * assumes one exists in order to draw the navigation.
 */
const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-4 py-12">
    <BrandLogo
      size="lg"
      standalone
      :label="t('app.name')"
    />

    <main
      id="main"
      class="w-full max-w-sm"
    >
      <slot />
    </main>

    <LocaleSwitcher />
  </div>
</template>
