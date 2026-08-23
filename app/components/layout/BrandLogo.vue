<script setup lang="ts">
import logoNavyUrl from '~/assets/img/pu-logo.svg'
import logoWhiteUrl from '~/assets/img/pu-logo-white.svg'

/**
 * The organization mark.
 *
 * The assets are imported rather than referenced by a public path so Vite fingerprints
 * them and the build fails loudly if a file is ever moved — a silently missing logo on
 * an executive's profile is the kind of defect that ships.
 *
 * TWO MARKS, NOT ONE WITH A FILTER
 *   The design system supplies a navy mark for light surfaces and a reversed
 *   mark for navy ones, both on a transparent ground. `tone` picks between
 *   them. Never recolour the mark with a CSS filter: the copper rule between
 *   PURE and DEVELOPMENT has to keep its own colour in both, and a filter would
 *   take it with the rest.
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
  /** `white` is the reversed mark, for navy surfaces. */
  tone?: 'navy' | 'white'
}>(), {
  standalone: false,
  size: 'md',
  tone: 'navy',
})

const SIZE_CLASS = {
  sm: 'h-10',
  md: 'h-14',
  lg: 'h-20',
}

const src = computed(() => (props.tone === 'white' ? logoWhiteUrl : logoNavyUrl))
const altText = computed(() => (props.standalone ? props.label ?? '' : ''))
</script>

<template>
  <img
    :src="src"
    :alt="altText"
    :aria-hidden="standalone ? undefined : 'true'"
    class="w-auto"
    :class="SIZE_CLASS[size]"
    decoding="async"
  >
</template>
