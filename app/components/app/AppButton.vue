<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

/**
 * The primary action control.
 *
 * Renders a `<button>`, a `<NuxtLink>` (when `to` is given) or an `<a>` (when `href`
 * is given) so that a navigation always produces a real link — keyboard users,
 * middle-click and "open in new tab" all depend on it, and a div with a click handler
 * silently breaks every one of them.
 *
 * Colours come from semantic tokens only. If a future design needs another variant,
 * add it here rather than passing utility classes in from a page.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  variant?: Variant
  size?: Size
  /** Internal navigation. Pass a localePath() result, not a raw path. */
  to?: RouteLocationRaw
  /** External navigation or a server download endpoint. */
  href?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  block?: boolean
  /** Forces a download rather than navigation (vCard, QR image). */
  download?: boolean | string
}>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
  block: false,
})

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'bg-surface text-foreground border border-border hover:bg-surface-hover',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  danger: 'bg-danger text-danger-fg hover:opacity-90',
  accent: 'bg-accent text-accent-fg hover:bg-accent-hover',
}

const SIZE_CLASS: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-sm',
  md: 'h-10 px-4 text-sm gap-2 rounded-md',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-md',
}

/** A loading button is not interactive: it must not accept a second submit. */
const isInert = computed(() => props.disabled || props.loading)

const classes = computed(() => [
  'inline-flex items-center justify-center font-medium transition-colors',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  'disabled:pointer-events-none disabled:opacity-50',
  VARIANT_CLASS[props.variant],
  SIZE_CLASS[props.size],
  props.block ? 'w-full' : '',
  isInert.value ? 'pointer-events-none opacity-50' : '',
])
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :class="classes"
    :aria-disabled="isInert ? 'true' : undefined"
  >
    <AppSpinner
      v-if="loading"
      :size="size === 'lg' ? 'md' : 'sm'"
    />
    <slot />
  </NuxtLink>

  <a
    v-else-if="href"
    :href="href"
    :class="classes"
    :download="download"
    :aria-disabled="isInert ? 'true' : undefined"
  >
    <AppSpinner
      v-if="loading"
      :size="size === 'lg' ? 'md' : 'sm'"
    />
    <slot />
  </a>

  <button
    v-else
    :type="type"
    :class="classes"
    :disabled="isInert"
    :aria-busy="loading ? 'true' : undefined"
  >
    <AppSpinner
      v-if="loading"
      :size="size === 'lg' ? 'md' : 'sm'"
    />
    <slot />
  </button>
</template>
