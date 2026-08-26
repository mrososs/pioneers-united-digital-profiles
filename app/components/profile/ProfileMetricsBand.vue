<script setup lang="ts">
import type { PublicMetricItem } from '#shared/types/profile-section'

/**
 * The summary strip: a handful of figures directly under the hero.
 *
 * This is the highest credibility-per-pixel block on the page and the one the
 * reference microsite leads with, so it sits above every other section and
 * outside the anchor navigation — a reader does not jump to it, they land on it.
 *
 * LAYOUT
 *   Two columns on a phone, four from `sm`. Not a horizontal scroller: that hides
 *   figures behind an edge, and hiding the evidence is the opposite of the point.
 *
 *   Dividers are a `gap-px` over a border-coloured ground rather than per-cell
 *   border utilities. Index arithmetic ("no rule before column one") has to know
 *   the column count, so it silently draws the wrong rules the moment the grid
 *   wraps to a second row or the operator adds a fifth figure. The gap technique
 *   is correct at any count and mirrors in Arabic for free.
 *
 * MARKUP
 *   A description list, with `flex-col-reverse` so the figure reads above its
 *   caption while the DOM keeps the valid `dt` → `dd` order. A screen reader
 *   therefore hears "Projects delivered, 42" rather than a bare number.
 *
 * WHY `tabular-nums` AND NOT `.pu-num`
 *   `.pu-num` also forces `direction: ltr`, which is right for a phone number or a
 *   slug but wrong here. A metric value is free text an operator wrote: "42" and
 *   "SAR 2.4B" are fine either way, but the Arabic equivalent is "٢.٤ مليار ر.س" —
 *   words, not just digits — and forcing LTR on it reorders them into nonsense.
 *   Tabular figures are the part actually wanted; the direction override is not.
 */
defineProps<{
  items: PublicMetricItem[]
}>()
</script>

<template>
  <AppCard padding="none">
    <dl class="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border sm:grid-cols-4">
      <div
        v-for="(metric, index) in items"
        :key="index"
        class="flex flex-col-reverse gap-1 bg-surface p-4 sm:p-5"
      >
        <dt
          v-if="metric.label"
          class="text-2xs leading-snug text-muted-fg"
        >
          {{ metric.label }}
        </dt>

        <dd
          v-if="metric.value"
          class="text-xl font-semibold tabular-nums text-heading sm:text-2xl"
        >
          {{ metric.value }}
        </dd>
      </div>
    </dl>
  </AppCard>
</template>
