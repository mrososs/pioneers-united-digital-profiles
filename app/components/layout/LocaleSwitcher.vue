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
 *
 * `tone="inverse"` is for the navy profile hero, where the design system's
 * fixed transparency steps on navy replace the light surface colours.
 */
withDefaults(defineProps<{
  tone?: 'default' | 'inverse'
}>(), {
  tone: 'default',
})

const { locale, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const options = computed(() =>
  LOCALE_CODES.map(code => ({
    code,
    name: LOCALE_NATIVE_NAME[code],
    path: switchLocalePath(code),
    active: code === (locale.value as LocaleCode),
  })),
)

const TONE_ACTIVE = {
  default: 'bg-muted font-semibold text-heading',
  inverse: 'bg-on-navy-16 font-semibold text-surface-inverse-fg',
}

const TONE_IDLE = {
  default: 'text-muted-fg hover:bg-muted hover:text-heading',
  inverse: 'text-on-navy-62 hover:bg-on-navy-10 hover:text-surface-inverse-fg',
}
</script>

<template>
  <nav
    :aria-label="t('common.language.switch')"
    class="flex items-center gap-1"
  >
    <AppIcon
      name="languages"
      :size="16"
      :class="tone === 'inverse' ? 'me-1 text-on-navy-62' : 'me-1 text-muted-fg'"
    />

    <NuxtLink
      v-for="option in options"
      :key="option.code"
      :to="option.path || '/'"
      :lang="option.code"
      :aria-current="option.active ? 'true' : undefined"
      class="rounded-xs px-2 py-1 text-xs transition-colors duration-[160ms] ease-standard
             focus-visible:outline-2 focus-visible:outline-offset-2"
      :class="[
        option.active ? TONE_ACTIVE[tone] : TONE_IDLE[tone],
        tone === 'inverse' ? 'focus-visible:outline-ring-inverse' : 'focus-visible:outline-ring',
      ]"
    >
      {{ option.name }}
    </NuxtLink>
  </nav>
</template>
