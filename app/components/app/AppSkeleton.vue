<script setup lang="ts">
/**
 * Loading placeholder.
 *
 * `aria-hidden` plus a `role="status"` region on the container is the right split: a
 * screen reader should hear "loading", not a description of grey rectangles. The pulse
 * animation is disabled automatically by the reduced-motion rule in main.css.
 */
withDefaults(defineProps<{
  variant?: 'text' | 'title' | 'block' | 'circle'
  width?: string
  height?: string
}>(), {
  variant: 'text',
})

const VARIANT_CLASS = {
  text: 'h-4 rounded-sm',
  title: 'h-7 rounded-sm',
  block: 'h-24 rounded-md',
  circle: 'size-10 rounded-full',
}
</script>

<template>
  <span
    class="block animate-pulse bg-muted"
    :class="VARIANT_CLASS[variant]"
    :style="{ width, height }"
    aria-hidden="true"
  />
</template>
