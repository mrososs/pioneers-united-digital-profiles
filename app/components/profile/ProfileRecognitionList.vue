<script setup lang="ts">
import type { PublicRecognitionItem } from '#shared/types/profile-section'

/**
 * Awards, press coverage and speaking engagements.
 *
 * Structurally the same as the credential list — a set of rows, optionally linked
 * — but kept as its own component rather than parameterising one "row list" with
 * a mode flag. The two blocks read differently (an award leads with its title and
 * cites a source; a credential leads with its name and cites an issuer), they are
 * likely to diverge further as the client uses them, and a shared component with
 * a `variant` prop is the shape that makes both harder to change.
 *
 * The year is `.pu-num` so a Gregorian year stays LTR inside an Arabic sentence.
 */
defineProps<{
  items: PublicRecognitionItem[]
}>()
</script>

<template>
  <ul class="flex flex-col gap-2.5">
    <li
      v-for="(entry, index) in items"
      :key="index"
    >
      <component
        :is="entry.url ? 'a' : 'div'"
        v-bind="entry.url ? { href: entry.url, target: '_blank', rel: 'noopener noreferrer' } : {}"
        class="flex items-start gap-3 rounded-md border border-border bg-surface p-4"
        :class="entry.url
          ? 'transition-colors duration-[160ms] ease-standard hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring'
          : ''"
      >
        <span class="min-w-0 flex-1">
          <span
            v-if="entry.title"
            class="block text-sm font-semibold text-balance text-heading"
          >
            {{ entry.title }}
          </span>

          <span
            v-if="entry.source || entry.year"
            class="mt-1 block text-xs text-muted-fg"
          >
            <span v-if="entry.source">{{ entry.source }}</span>
            <span
              v-if="entry.source && entry.year"
              aria-hidden="true"
            > · </span>
            <span
              v-if="entry.year"
              class="pu-num"
            >{{ entry.year }}</span>
          </span>
        </span>

        <AppIcon
          v-if="entry.url"
          name="arrow-up-right"
          :size="15"
          class="mt-0.5 shrink-0 text-faint rtl:-scale-x-100"
        />
      </component>
    </li>
  </ul>
</template>
