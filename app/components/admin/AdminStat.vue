<script setup lang="ts">
/**
 * A headline figure on the dashboard.
 *
 * DESIGN SYSTEM
 *   Micro-cap label over a 38px display number at 600 with the display
 *   tracking, tabular so a row of stats keeps its digits aligned as the values
 *   change.
 *
 * MOTION
 *   `v-count-up` runs the figure from zero when the card scrolls into view. It
 *   takes the number as a binding rather than reading the rendered text, because
 *   the rendered text is already localised — an Arabic dashboard shows "١٢" and
 *   parsing that back into a number to animate it would be absurd. The directive
 *   formats each frame with the document's own language, so the intermediate
 *   values and the final one are formatted identically.
 *
 *   The value is also rendered server-side inside the element, so the figure is
 *   correct before hydration and for anyone with motion turned off.
 */
defineProps<{
  label: string
  value: number
  /** Optional supporting line under the figure. */
  meta?: string
}>()

const { n } = useI18n()
</script>

<template>
  <AppCard padding="none">
    <div class="p-5">
      <p class="pu-label-caps text-muted-fg">
        {{ label }}
      </p>

      <p
        v-count-up="value"
        class="mt-2.5 text-4xl leading-none font-semibold tabular-nums tracking-display text-heading"
      >
        {{ n(value) }}
      </p>

      <p
        v-if="meta"
        class="mt-2 text-2xs text-muted-fg"
      >
        {{ meta }}
      </p>
    </div>
  </AppCard>
</template>
