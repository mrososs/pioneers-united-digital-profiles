<script setup lang="ts">
import type { PublicLanguageItem } from '#shared/types/profile-section'

/**
 * Languages and proficiency.
 *
 * The smallest block on the page, and the one most likely to be skimmed, so it is
 * a compact two-column list rather than cards: a card each for "Arabic — Native"
 * would spend a screen of a phone on four words.
 *
 * A description list, because that is exactly the shape of the data — a term and
 * its value.
 */
defineProps<{
  items: PublicLanguageItem[]
}>()
</script>

<template>
  <dl class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
    <div
      v-for="(language, index) in items"
      :key="index"
      class="flex items-baseline justify-between gap-3 border-b border-border pb-2"
    >
      <dt
        v-if="language.name"
        class="text-sm font-semibold text-heading"
      >
        {{ language.name }}
      </dt>

      <dd
        v-if="language.level"
        class="text-xs text-muted-fg"
      >
        {{ language.level }}
      </dd>
    </div>
  </dl>
</template>
