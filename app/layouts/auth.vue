<script setup lang="ts">
/**
 * Layout for the administrator sign-in screen.
 *
 * Separate from `admin` because it must render without a session — the admin layout
 * assumes one exists in order to draw the navigation.
 *
 * DESIGN SYSTEM
 *   The system's `Login` screen is a navy panel beside the form. Below `lg` the
 *   panel would push the form under the fold on a phone, so it is dropped there
 *   and the form takes the whole sand page — the panel is brand presence, not
 *   information, and nothing is lost by hiding it.
 */
const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-dvh flex-col lg:flex-row">
    <!-- Brand panel. Decorative, so it carries no content a signing-in
         administrator needs, and it is simply absent on a phone. -->
    <aside class="pu-hero-motif relative hidden overflow-hidden bg-surface-inverse lg:flex lg:w-[46%] lg:max-w-[620px] lg:flex-col lg:justify-between lg:p-12">
      <BrandLogo
        tone="white"
        size="md"
      />

      <div class="flex flex-col gap-5">
        <span
          class="pu-rule"
          style="--pu-rule-w: 56px"
          aria-hidden="true"
        />
        <p class="max-w-[24ch] text-4xl font-semibold tracking-display text-balance text-surface-inverse-fg">
          {{ t('app.name') }}
        </p>
        <p class="max-w-[46ch] text-sm text-on-navy-78">
          {{ t('app.tagline') }}
        </p>
      </div>

      <p class="pu-eyebrow text-accent">
        {{ t('admin.title') }}
      </p>
    </aside>

    <div class="flex flex-1 flex-col items-center justify-center gap-8 bg-background px-5 py-12">
      <BrandLogo
        class="lg:hidden"
        size="lg"
        standalone
        :label="t('app.name')"
      />

      <main
        id="main"
        class="w-full max-w-[400px]"
      >
        <slot />
      </main>

      <LocaleSwitcher />
    </div>
  </div>
</template>
