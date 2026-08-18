<script setup lang="ts">
/**
 * Title, description and action slot for a dashboard screen.
 *
 * Every admin page uses it so headings stay at one level and one size, which is what makes
 * the document outline usable with a screen reader.
 *
 * DESIGN SYSTEM
 *   30px display type at 600 with the display tracking, an optional micro-cap
 *   eyebrow above it, and a description capped at 56ch so it never runs to an
 *   unreadable measure. Actions sit at the trailing edge and wrap below the
 *   title on a narrow viewport rather than squeezing it.
 */
defineProps<{
  title: string
  description?: string
  /** Micro-cap line above the title. Use for the section a screen belongs to. */
  eyebrow?: string
}>()
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-2 pb-1">
    <div class="min-w-0 flex-1 basis-80">
      <p
        v-if="eyebrow"
        class="pu-eyebrow mb-2 text-muted-fg"
      >
        {{ eyebrow }}
      </p>

      <h1 class="text-3xl font-semibold tracking-display text-balance text-heading">
        {{ title }}
      </h1>

      <p
        v-if="description"
        class="mt-2 max-w-[56ch] text-sm text-body"
      >
        {{ description }}
      </p>
    </div>

    <div
      v-if="$slots.actions"
      class="flex shrink-0 flex-wrap items-center gap-2.5"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
