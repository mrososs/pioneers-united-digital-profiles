<script setup lang="ts">
/**
 * Indeterminate progress indicator.
 *
 * Decorative: the accessible label lives on the control that owns the pending
 * state (`AppButton` sets `aria-busy`), not here.
 *
 * Uses the design system's `loader-circle` glyph rather than a bordered circle
 * so the arc weight matches every other icon on the screen. The rotation is one
 * of the few animations the system allows, and it stops under
 * `prefers-reduced-motion` via the global rule in main.css.
 */
withDefaults(defineProps<{
  /** Edge length in pixels. Match the icon size of the control it sits in. */
  size?: number
}>(), {
  size: 17,
})
</script>

<template>
  <AppIcon
    name="loader-circle"
    :size="size"
    class="motion-safe:animate-spin"
  />
</template>
