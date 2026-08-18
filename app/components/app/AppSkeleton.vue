<script setup lang="ts">
/**
 * Loading placeholder.
 *
 * `aria-hidden` plus a `role="status"` region on the container is the right split: a
 * screen reader should hear "loading", not a description of grey rectangles.
 *
 * DESIGN SYSTEM
 *   The shimmer is one of only two things in the system permitted to animate on
 *   their own, and it is a sand gradient sweep rather than a grey pulse —
 *   `.pu-shimmer` in main.css. It stops under `prefers-reduced-motion`.
 */
withDefaults(defineProps<{
  variant?: 'text' | 'title' | 'block' | 'circle'
  width?: string
  height?: string
}>(), {
  variant: 'text',
})

const VARIANT_CLASS = {
  text: 'h-3.5 rounded-xs',
  title: 'h-7 rounded-xs',
  block: 'h-24 rounded-sm',
  circle: 'size-10 rounded-full',
}
</script>

<template>
  <span
    class="pu-shimmer block"
    :class="VARIANT_CLASS[variant]"
    :style="{ width, height }"
    aria-hidden="true"
  />
</template>
