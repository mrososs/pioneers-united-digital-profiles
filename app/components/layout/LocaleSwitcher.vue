<script setup lang="ts">
import { LOCALE_CODES, LOCALE_NATIVE_NAME } from '#shared/constants/locales'
import type { LocaleCode } from '#shared/constants/locales'

/**
 * Language switcher.
 *
 * Built on `switchLocalePath()`, which resolves the SAME route in the other locale, so
 * `/en/sample-executive` maps to `/ar/sample-executive` and a visitor never loses their
 * place. Hard-coding `/ar` + path would break on any route with parameters.
 *
 * Rendered as real links: `switchLocalePath` returns a URL, so the switch is
 * crawlable, shareable and works before hydration. Each option is labelled in its own
 * language (its endonym), which is the convention users expect, and `lang` is set per
 * link so a screen reader pronounces "العربية" in Arabic.
 */
const { locale } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const { t } = useI18n()

const options = computed(() =>
  LOCALE_CODES.map(code => ({
    code,
    name: LOCALE_NATIVE_NAME[code],
    path: switchLocalePath(code),
    active: code === (locale.value as LocaleCode),
  })),
)
</script>

<template>
  <nav
    :aria-label="t('common.language.switch')"
    class="flex items-center gap-1"
  >
    <NuxtLink
      v-for="option in options"
      :key="option.code"
      :to="option.path || '/'"
      :lang="option.code"
      :aria-current="option.active ? 'true' : undefined"
      class="rounded-sm px-2 py-1 text-sm transition-colors
             focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      :class="option.active
        ? 'bg-muted font-medium text-foreground'
        : 'text-muted-fg hover:bg-muted hover:text-foreground'"
    >
      {{ option.name }}
    </NuxtLink>
  </nav>
</template>
