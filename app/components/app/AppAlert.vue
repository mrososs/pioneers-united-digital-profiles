<script setup lang="ts">
/**
 * Inline message for form and action feedback.
 *
 * `role` is derived from the tone: errors announce immediately (`alert`), everything
 * else politely (`status`). Getting this wrong either interrupts a screen-reader user
 * mid-sentence or leaves a failed save silently unannounced.
 */
type Tone = 'info' | 'success' | 'warning' | 'danger'

const props = withDefaults(defineProps<{
  tone?: Tone
  title?: string
}>(), {
  tone: 'info',
})

const TONE_CLASS: Record<Tone, string> = {
  info: 'bg-info-surface text-info border-info/20',
  success: 'bg-success-surface text-success border-success/20',
  warning: 'bg-warning-surface text-warning border-warning/20',
  danger: 'bg-danger-surface text-danger border-danger/20',
}

const role = computed(() => (props.tone === 'danger' ? 'alert' : 'status'))
</script>

<template>
  <div
    :role="role"
    class="rounded-md border px-3 py-2.5 text-sm"
    :class="TONE_CLASS[tone]"
  >
    <p
      v-if="title"
      class="font-medium"
    >
      {{ title }}
    </p>
    <div :class="title ? 'mt-0.5' : ''">
      <slot />
    </div>
  </div>
</template>
