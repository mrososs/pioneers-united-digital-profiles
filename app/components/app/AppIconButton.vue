<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

/**
 * A square, icon-only control.
 *
 * `label` is REQUIRED and becomes `aria-label` plus the tooltip. An icon-only button
 * with no accessible name is invisible to a screen reader, so the API makes it
 * impossible to create one — accessibility is enforced by the type, not by review.
 *
 * SIZES
 *   The design system draws these at 36px for dense admin toolbars. This
 *   repository's accessibility rule is 40px minimum for icon-only controls, and
 *   the design system's own `--hit-min` is 44px on profile screens, so `md` is
 *   40 and `lg` is 44. `sm` (36) matches the system exactly and is reserved for
 *   table row actions, where the surrounding cell padding carries the target to
 *   44px.
 */
type Size = 'sm' | 'md' | 'lg'
type Variant = 'solid' | 'ghost' | 'outline' | 'danger' | 'inverse'

const props = withDefaults(defineProps<{
  label: string
  size?: Size
  variant?: Variant
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
  sm: 'size-9',
  md: 'size-10',
  lg: 'size-11',
}

const VARIANT_CLASS: Record<Variant, string> = {
  solid: 'border-transparent bg-primary text-primary-fg hover:bg-primary-hover',
  ghost: 'border-transparent text-body hover:bg-surface-hover hover:text-heading',
  outline: 'border-border-default bg-surface text-body hover:border-border-strong hover:bg-surface-hover hover:text-heading',
  danger: 'border-transparent text-body hover:border-danger/45 hover:bg-danger-surface hover:text-danger',
  inverse: 'border-border-inverse text-on-navy-62 hover:bg-on-navy-10 hover:text-surface-inverse-fg',
}

const classes = computed(() => [
  'inline-grid place-items-center rounded-sm border',
  'transition-[background-color,border-color,color] duration-[160ms] ease-standard',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  'disabled:pointer-events-none disabled:border-transparent disabled:bg-muted disabled:text-faint',
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
