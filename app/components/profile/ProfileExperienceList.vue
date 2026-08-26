<script setup lang="ts">
import type { PublicExperienceItem } from '#shared/types/profile-section'

/**
 * Career history.
 *
 * THE ONE BLOCK WHERE SEQUENCE IS REAL
 *   Every other section here is a set; this one is an ordered narrative, and the
 *   order carries information a reader needs. That is why it gets the timeline
 *   rail — a structural device that says "these are in sequence" — while the
 *   credential and recognition lists, which are sets, deliberately do not.
 *
 * THE RAIL
 *   A logical `border-s` on the list with a marker per row. In Arabic the whole
 *   thing mirrors to the right edge without a single directional override,
 *   because nothing here names a physical side.
 *
 *   The marker is `bg-accent` — the copper is the design system's only decorative
 *   accent, and a 7px dot is within the "restrained" budget it allows.
 */
defineProps<{
  items: PublicExperienceItem[]
}>()
</script>

<template>
  <ol class="flex flex-col gap-6 border-s border-border ps-5">
    <li
      v-for="(entry, index) in items"
      :key="index"
      class="relative flex flex-col gap-1"
    >
      <span
        aria-hidden="true"
        class="absolute top-1.5 -start-[1.4375rem] size-[7px] rounded-full bg-accent ring-4 ring-background"
      />

      <!-- `tabular-nums`, not `.pu-num`: a period is written text, and the
           Arabic form ("٢٠١٩ — حتى الآن") carries words that `.pu-num`'s forced
           LTR would reorder. Same reasoning as ProfileMetricsBand. -->
      <p
        v-if="entry.period"
        class="text-2xs tabular-nums text-muted-fg"
      >
        {{ entry.period }}
      </p>

      <h3
        v-if="entry.role"
        class="text-sm font-semibold text-heading"
      >
        {{ entry.role }}
      </h3>

      <p
        v-if="entry.organization"
        class="text-xs text-accent"
      >
        {{ entry.organization }}
      </p>

      <p
        v-if="entry.summary"
        class="mt-0.5 text-sm leading-relaxed text-pretty text-body"
      >
        {{ entry.summary }}
      </p>
    </li>
  </ol>
</template>
