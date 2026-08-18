<script setup lang="ts">
import type { IconName } from '~/utils/icons'

/**
 * Inline message for form and action feedback.
 *
 * `role` is derived from the tone: errors announce immediately (`alert`), everything
 * else politely (`status`). Getting this wrong either interrupts a screen-reader user
 * mid-sentence or leaves a failed save silently unannounced.
 *
 * The glyph is `aria-hidden` and duplicates what the text already says, because
 * the design system's rule is that colour and iconography are decoration — the
 * words carry the meaning.
 */
type Tone = 'info' | 'success' | 'warning' | 'danger'

const props = withDefaults(defineProps<{
  tone?: Tone
  title?: string
}>(), {
  tone: 'info',
})

const TONE_CLASS: Record<Tone, string> = {
  info: 'bg-info-surface text-info border-border-default',
  success: 'bg-success-surface text-success border-success/20',
  warning: 'bg-warning-surface text-warning border-warning/20',
  danger: 'bg-danger-surface text-danger border-danger/20',
}

const TONE_ICON: Record<Tone, IconName> = {
  info: 'circle-alert',
  success: 'circle-check',
  warning: 'clock',
  danger: 'circle-alert',
}

const role = computed(() => (props.tone === 'danger' ? 'alert' : 'status'))
</script>

<template>
  <div
    :role="role"
    class="flex items-start gap-2.5 rounded-sm border px-3.5 py-3 text-sm"
    :class="TONE_CLASS[tone]"
  >
    <AppIcon
      :name="TONE_ICON[tone]"
      :size="17"
      class="mt-px"
    />

    <div class="min-w-0 flex-1">
      <p
        v-if="title"
        class="font-semibold"
      >
        {{ title }}
      </p>
      <div :class="title ? 'mt-0.5' : ''">
        <slot />
      </div>
    </div>
  </div>
</template>
