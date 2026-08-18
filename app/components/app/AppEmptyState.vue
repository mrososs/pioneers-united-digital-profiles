<script setup lang="ts">
/**
 * Empty / zero-data state.
 *
 * A standard component rather than ad-hoc markup so that "there is nothing here" always
 * explains itself and offers the next action, instead of showing a blank panel the user
 * has to interpret. Also used for the "not configured yet" states in wallet settings.
 *
 * DESIGN SYSTEM
 *   The mark is a 48px square plate with a hairline border, not an illustration
 *   — the system has no illustration and no iconographic decoration. Explanatory
 *   text is capped so it never runs to an unreadable measure.
 */
import type { IconName } from '~/utils/icons'

withDefaults(defineProps<{
  title: string
  description?: string
  /** Glyph for the plate. Defaults to the generic "nothing here" mark. */
  icon?: IconName
}>(), {
  icon: 'id-card',
})
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3.5 px-6 py-16 text-center">
    <span class="grid size-12 place-items-center rounded-sm border border-border-default text-faint">
      <slot name="icon">
        <AppIcon
          :name="icon"
          :size="20"
        />
      </slot>
    </span>

    <p class="text-lg font-semibold text-heading">
      {{ title }}
    </p>

    <p
      v-if="description"
      class="max-w-[392px] text-sm text-body"
    >
      {{ description }}
    </p>

    <div
      v-if="$slots.action"
      class="mt-0.5 flex gap-2.5"
    >
      <slot name="action" />
    </div>
  </div>
</template>
