<script setup lang="ts">
import type { PublicTagItem } from '#shared/types/profile-section'

/**
 * A flat list of labels — areas of expertise on a person, sectors served on a
 * company.
 *
 * `square` because these are not status pills: the design system reserves the
 * pill radius for state, and a capability is not a state. `outline` keeps them
 * quiet, since a list of twelve filled chips would out-shout the content around
 * it.
 *
 * A `<ul>` rather than a row of spans, so the set is announced as a list with a
 * count instead of an undifferentiated run of words.
 */
defineProps<{
  items: PublicTagItem[]
}>()
</script>

<template>
  <ul class="flex flex-wrap gap-2">
    <li
      v-for="(tag, index) in items"
      :key="index"
    >
      <AppBadge
        tone="outline"
        size="md"
        square
      >
        {{ tag.label }}
      </AppBadge>
    </li>
  </ul>
</template>
