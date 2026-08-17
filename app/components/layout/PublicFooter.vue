<script setup lang="ts">
/** Footer for the public surface. Keeps the corporate site one tap away. */
const { t } = useI18n()

const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-border bg-surface">
    <div class="mx-auto flex max-w-3xl flex-col items-center gap-2 px-4 py-8 text-center">
      <p class="text-xs text-muted-fg">
        &copy; {{ currentYear }} {{ t('app.organization') }}
      </p>

      <a
        href="https://pioneersunited.com"
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs text-muted-fg underline decoration-border underline-offset-4 transition-colors hover:text-foreground
               focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {{ t('home.corporateCta') }}
      </a>
    </div>
  </footer>
</template>
