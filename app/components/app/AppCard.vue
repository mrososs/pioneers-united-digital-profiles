<script setup lang="ts">
/** Surface container. The one place card padding, radius and elevation are decided. */
withDefaults(defineProps<{
  as?: 'div' | 'section' | 'article' | 'li'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}>(), {
  as: 'div',
  padding: 'md',
})

const PADDING_CLASS = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-8',
}
</script>

<template>
  <component
    :is="as"
    class="rounded-lg border border-border bg-surface shadow-card"
    :class="PADDING_CLASS[padding]"
  >
    <slot />
  </component>
</template>
