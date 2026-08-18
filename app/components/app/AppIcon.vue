<script setup lang="ts">
import type { IconName } from '~/utils/icons'
import { resolveIcon } from '~/utils/icons'

/**
 * A glyph from the Pioneers United icon set.
 *
 * DECORATIVE BY DEFAULT
 *   An icon almost always sits beside a label that already carries the meaning,
 *   so the default is `aria-hidden`. Pass `title` only when the glyph is the
 *   sole carrier of meaning; that switches it to `role="img"` with an
 *   accessible name. Icon-only *controls* get their name from
 *   `AppIconButton`'s required `label`, not from here.
 *
 * `v-html` is safe here and only here: the markup is a compile-time constant
 * from `app/utils/icons.ts`, never a prop, never anything a user can influence.
 *
 * Sizes follow the design system — 20px in UI, 17–19px inside buttons, 15–16px
 * in table rows and fields — and the glyph always inherits `currentColor`.
 */
const props = withDefaults(defineProps<{
  name: IconName
  /** Edge length in pixels. */
  size?: number
  /** Line-icon stroke weight. Ignored by solid brand marks. */
  strokeWidth?: number
  /** Accessible name. Omit for decoration, which is the usual case. */
  title?: string
}>(), {
  size: 20,
  strokeWidth: 1.75,
})

const icon = computed(() => resolveIcon(props.name))

const strokeAttrs = computed(() =>
  icon.value?.solid
    ? { fill: 'currentColor' }
    : {
        'fill': 'none',
        'stroke': 'currentColor',
        'stroke-width': props.strokeWidth,
        'stroke-linecap': 'round' as const,
        'stroke-linejoin': 'round' as const,
      },
)
</script>

<template>
  <svg
    v-if="icon"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    v-bind="strokeAttrs"
    :role="title ? 'img' : undefined"
    :aria-hidden="title ? undefined : 'true'"
    focusable="false"
    class="block shrink-0"
  >
    <title v-if="title">{{ title }}</title>
    <!-- eslint-disable-next-line vue/no-v-html -- compile-time constant, see above -->
    <g v-html="icon.body" />
  </svg>
</template>
