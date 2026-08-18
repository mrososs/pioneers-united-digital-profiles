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
 * DESIGN SYSTEM
 *   44px tall (36 small, 52 large), 4px radius, 600 weight, 14px. Hover darkens
 *   navy one step, press darkens one further; nothing scales and nothing moves.
 *   The `inverse` pair exists for the navy profile hero, where a normal
 *   secondary button would disappear into the surface.
 *
 *   The accent is bronze and the design system is explicit that it is never a
 *   button fill — it is for rules, QR ticks and the company badge. The `accent`
 *   variant is kept for the odd promotional surface but is deliberately not used
 *   anywhere in the product.
 *
 * Colours come from semantic tokens only. If a future design needs another variant,
 * add it here rather than passing utility classes in from a page.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'inverse' | 'inverse-outline'
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
  'primary': 'bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active',
  'secondary': 'bg-surface text-heading border border-border-default hover:bg-surface-hover hover:border-border-strong',
  'ghost': 'text-heading hover:bg-surface-hover',
  'danger': 'text-danger border border-danger/25 hover:bg-danger-surface hover:border-danger/45',
  'accent': 'bg-accent text-accent-fg hover:bg-accent-hover',
  'inverse': 'bg-surface-inverse-fg text-primary hover:bg-surface-inverse-fg/85',
  'inverse-outline': 'text-on-navy-78 border border-border-inverse hover:bg-on-navy-10 hover:text-surface-inverse-fg',
}

const SIZE_CLASS: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-md gap-2.5',
}

const ICON_SIZE: Record<Size, number> = { sm: 15, md: 17, lg: 19 }

/** A loading button is not interactive: it must not accept a second submit. */
const isInert = computed(() => props.disabled || props.loading)

const classes = computed(() => [
  'inline-flex items-center justify-center rounded-sm border border-transparent font-semibold whitespace-nowrap',
  // Arabic takes no tracking; the design system removes it rather than reducing it.
  'ltr:tracking-[0.01em]',
  'transition-[background-color,border-color,color,box-shadow] duration-[160ms] ease-standard',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  VARIANT_CLASS[props.variant],
  SIZE_CLASS[props.size],
  props.block ? 'w-full' : '',
  isInert.value
    ? 'pointer-events-none border-transparent bg-muted text-faint hover:bg-muted'
    : '',
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
      :size="ICON_SIZE[size]"
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
      :size="ICON_SIZE[size]"
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
      :size="ICON_SIZE[size]"
    />
    <slot />
  </button>
</template>
