<script setup lang="ts">
/** Indeterminate progress indicator. Decorative: the accessible label lives on the
 * control that owns the pending state, not here. */
const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md',
})

const sizeClass = computed(() => ({
  sm: 'size-3.5 border',
  md: 'size-4 border-2',
  lg: 'size-6 border-2',
}[props.size]))
</script>

<template>
  <span
    class="inline-block animate-spin rounded-full border-current border-e-transparent align-[-0.125em]"
    :class="sizeClass"
    aria-hidden="true"
  />
</template>
