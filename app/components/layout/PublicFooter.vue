<script setup lang="ts">
/**
 * Footer for the public surface. Keeps the corporate site one tap away.
 *
 * DESIGN SYSTEM
 *   The profile closes on the namespace in IBM Plex Mono — the same face the QR
 *   caption and every slug use. It is `dir="ltr"` so an Arabic page does not
 *   reorder the host, and it is a label rather than a link: it tells a visitor
 *   what to type or expect on a printed card, and the actual navigation is the
 *   corporate link below it.
 */
const { t } = useI18n()
const config = useRuntimeConfig()

const currentYear = new Date().getFullYear()

/**
 * Host only — the path is whatever profile the visitor is already on.
 * `URL` rather than a pair of regexes: it handles a port, a trailing slash and a
 * missing scheme without any of them being a special case here.
 */
const namespace = computed(() => {
  try {
    return new URL(config.public.siteUrl).host
  }
  catch {
    return config.public.siteUrl
  }
})
</script>

<template>
  <footer class="mt-auto border-t border-border bg-surface">
    <div class="mx-auto flex max-w-profile-wide flex-col items-center gap-3 px-5 py-9 text-center lg:px-10">
      <span
        class="pu-rule"
        aria-hidden="true"
      />

      <p
        class="pu-mono text-2xs text-muted-fg"
        dir="ltr"
      >
        {{ namespace }}
      </p>

      <p class="text-2xs text-faint">
        &copy; {{ currentYear }} {{ t('app.organization') }}
      </p>

      <a
        href="https://pioneersunited.com"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 rounded-xs text-2xs text-muted-fg
               transition-colors duration-[160ms] ease-standard hover:text-accent
               focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {{ t('home.corporateCta') }}
        <AppIcon
          name="arrow-up-right"
          :size="13"
        />
      </a>
    </div>
  </footer>
</template>
