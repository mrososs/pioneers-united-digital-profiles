<script setup lang="ts">
/**
 * Title, description and action slot for a dashboard screen.
 *
 * Every admin page uses it so headings stay at one level and one size, which is what makes
 * the document outline usable with a screen reader.
 */
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div class="min-w-0">
      <h1 class="text-xl font-semibold text-foreground">
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="mt-1 max-w-prose text-sm text-muted-fg"
      >
        {{ description }}
      </p>
    </div>

    <div
      v-if="$slots.actions"
      class="flex shrink-0 flex-wrap gap-2"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
