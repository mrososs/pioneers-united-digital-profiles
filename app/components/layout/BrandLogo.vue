<script setup lang="ts">
import logoUrl from '~/assets/img/pure-development-logo.svg'

/**
 * The organization mark.
 *
 * The asset is imported rather than referenced by a public path so Vite fingerprints it
 * and the build fails loudly if the file is ever moved — a silently missing logo on an
 * executive's profile is the kind of defect that ships.
 *
 * The mark supplied with this repository has its dark background baked in, so no
 * light/dark variant switching is wired up yet. When the design system delivers a
 * transparent or inverted mark, add it here and swap on `prefers-color-scheme`; nothing
 * outside this component needs to change.
 *
 * `alt` is intentionally empty when the logo sits next to the organization name: a
 * screen reader announcing "Pioneers United logo, Pioneers United" is noise. Pass
 * `standalone` when the mark is the only identifier present.
 */
const props = withDefaults(defineProps<{
  /** Accessible name for the mark. Required when `standalone`. */
  label?: string
  standalone?: boolean
  size?: 'sm' | 'md' | 'lg'
}>(), {
  standalone: false,
  size: 'md',
})

const SIZE_CLASS = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
}

const altText = computed(() => (props.standalone ? props.label ?? '' : ''))
</script>

<template>
  <img
    :src="logoUrl"
    :alt="altText"
    :aria-hidden="standalone ? undefined : 'true'"
    class="w-auto rounded-sm"
    :class="SIZE_CLASS[size]"
    decoding="async"
  >
</template>
