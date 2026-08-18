<script setup lang="ts">
/**
 * Status pill.
 *
 * Tone conveys meaning, so the label must always carry it too — a colour-only
 * distinction is invisible to a colour-blind user and to a screen reader.
 *
 * DESIGN SYSTEM
 *   24px tall, pill radius, 12px semibold with 0.03em tracking that Arabic
 *   drops. Pills are reserved for status chips; use `square` when a badge is
 *   labelling something that is not a status. Semantic colour is restricted to
 *   three families, so `accent` (bronze) is the company marker rather than a
 *   fourth status.
 */
type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'outline' | 'inverse'

const props = withDefaults(defineProps<{
  tone?: Tone
  size?: 'sm' | 'md'
  /** 2px corners instead of a pill. For non-status labels. */
  square?: boolean
}>(), {
  tone: 'neutral',
  size: 'md',
  square: false,
})

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-info-surface text-muted-fg',
  success: 'bg-success-surface text-success',
  warning: 'bg-warning-surface text-warning',
  danger: 'bg-danger-surface text-danger',
  info: 'bg-info-surface text-info',
  accent: 'bg-accent-surface text-accent-hover',
  outline: 'border-border-default bg-transparent text-body',
  inverse: 'bg-on-navy-10 text-surface-inverse-fg',
}

const classes = computed(() => [
  'inline-flex items-center gap-1.5 border border-transparent font-semibold whitespace-nowrap',
  'ltr:tracking-[0.03em]',
  props.square ? 'rounded-xs' : 'rounded-full',
  props.size === 'sm' ? 'h-5 px-2 text-3xs' : 'h-6 px-2.5 text-2xs',
  TONE_CLASS[props.tone],
])
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
