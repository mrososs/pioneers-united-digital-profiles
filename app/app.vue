<script setup lang="ts">
/**
 * Application shell.
 *
 * Its only jobs are the document-level i18n attributes and the layout/page outlet.
 * Everything else belongs to a layout or a page — see app/CLAUDE.md.
 *
 * `useLocaleHead` is what makes RTL work globally: it writes `lang` and `dir` onto
 * <html> for the active locale, so Tailwind's logical utilities (ps-*, pe-*,
 * text-start) and the Arabic font stack in main.css switch over with no per-component
 * code. Never hard-code `dir` anywhere else.
 */
const localeHead = useLocaleHead({ dir: true, lang: true, seo: true })
const { t } = useI18n()

useHead(() => ({
  htmlAttrs: localeHead.value.htmlAttrs,
  link: localeHead.value.link,
  meta: localeHead.value.meta,
  titleTemplate: title => (title ? `${title} — ${t('app.shortName')}` : t('app.name')),
}))
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
