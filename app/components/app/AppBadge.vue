<script setup lang="ts">
/**
 * Status pill.
 *
 * Tone conveys meaning, so the label must always carry it too — a colour-only
 * distinction is invisible to a colour-blind user and to a screen reader.
 */
type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'

const props = withDefaults(defineProps<{
  tone?: Tone
  size?: 'sm' | 'md'
}>(), {
  tone: 'neutral',
  size: 'md',
})

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-fg',
  success: 'bg-success-surface text-success',
  warning: 'bg-warning-surface text-warning',
  danger: 'bg-danger-surface text-danger',
  info: 'bg-info-surface text-info',
  accent: 'bg-accent text-accent-fg',
}

const classes = computed(() => [
  'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
  props.size === 'sm' ? 'px-2 py-0.5 text-[0.6875rem]' : 'px-2.5 py-1 text-xs',
  TONE_CLASS[props.tone],
])
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
