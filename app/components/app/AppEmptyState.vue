<script setup lang="ts">
/**
 * Empty / zero-data state.
 *
 * A standard component rather than ad-hoc markup so that "there is nothing here" always
 * explains itself and offers the next action, instead of showing a blank panel the user
 * has to interpret. Also used for the "not configured yet" states in wallet settings.
 */
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
    <div
      v-if="$slots.icon"
      class="text-muted-fg"
    >
      <slot name="icon" />
    </div>

    <p class="text-base font-medium text-foreground">
      {{ title }}
    </p>

    <p
      v-if="description"
      class="max-w-prose text-sm text-muted-fg"
    >
      {{ description }}
    </p>

    <div
      v-if="$slots.action"
      class="mt-2"
    >
      <slot name="action" />
    </div>
  </div>
</template>
