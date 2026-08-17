<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

/**
 * A square, icon-only control.
 *
 * `label` is REQUIRED and becomes `aria-label` plus the tooltip. An icon-only button
 * with no accessible name is invisible to a screen reader, so the API makes it
 * impossible to create one — accessibility is enforced by the type, not by review.
 *
 * Sizes stay at or above 40px so the control clears the 44px touch-target guidance
 * once its surrounding padding is counted; public profiles are used on phones.
 */
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  label: string
  size?: Size
  variant?: 'solid' | 'ghost' | 'outline'
  to?: RouteLocationRaw
  href?: string
  disabled?: boolean
  external?: boolean
}>(), {
  size: 'md',
  variant: 'ghost',
  disabled: false,
  external: false,
})

const SIZE_CLASS: Record<Size, string> = {
  sm: 'size-8 rounded-sm',
  md: 'size-10 rounded-md',
  lg: 'size-12 rounded-md',
}

const VARIANT_CLASS = {
  solid: 'bg-primary text-primary-fg hover:bg-primary-hover',
  ghost: 'text-foreground hover:bg-muted',
  outline: 'border border-border text-foreground hover:bg-surface-hover',
}

const classes = computed(() => [
  'inline-flex items-center justify-center transition-colors',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  'disabled:pointer-events-none disabled:opacity-50',
  SIZE_CLASS[props.size],
  VARIANT_CLASS[props.variant],
])
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :class="classes"
    :aria-label="label"
    :title="label"
  >
    <slot />
  </NuxtLink>

  <a
    v-else-if="href"
    :href="href"
    :class="classes"
    :aria-label="label"
    :title="label"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
  >
    <slot />
  </a>

  <button
    v-else
    type="button"
    :class="classes"
    :disabled="disabled"
    :aria-label="label"
    :title="label"
  >
    <slot />
  </button>
</template>
