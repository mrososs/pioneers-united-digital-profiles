<script setup lang="ts">
import type { PublicDocumentItem } from '#shared/types/profile-section'

/**
 * Downloadable material — a CV, a company profile, a capability statement.
 *
 * The reference microsite's "evidence room", and the one thing prospects
 * currently ask for by email.
 *
 * EVERY ROW IS A LINK
 *   The mapper drops any item without a URL, so `url` is present on everything
 *   that reaches this component and the whole card can safely be the anchor.
 *
 * NO `download` ATTRIBUTE
 *   It only works same-origin, and these files may be served from Supabase
 *   storage on a different host — where the attribute is silently ignored and the
 *   browser navigates instead. Promising a download and delivering a tab is worse
 *   than opening the tab honestly, so the affordance says "open" and the icon is
 *   an external-link arrow.
 *
 * `fileType` is a display hint the operator typed. It is shown as a label and
 * never used to decide how the response is handled.
 */
defineProps<{
  items: PublicDocumentItem[]
}>()
</script>

<template>
  <ul class="grid gap-3 sm:grid-cols-2">
    <li
      v-for="(document, index) in items"
      :key="index"
    >
      <a
        :href="document.url ?? undefined"
        target="_blank"
        rel="noopener noreferrer"
        class="flex h-full items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-card
               transition-[box-shadow,border-color] duration-[240ms] ease-standard
               hover:border-border-default hover:shadow-raised
               focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span class="grid size-9 shrink-0 place-items-center rounded-xs bg-muted text-accent">
          <AppIcon
            name="file-text"
            :size="18"
          />
        </span>

        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2">
            <span
              v-if="document.title"
              class="min-w-0 flex-1 text-sm font-semibold text-heading"
            >
              {{ document.title }}
            </span>

            <AppBadge
              v-if="document.fileType"
              tone="outline"
              size="sm"
              square
            >
              {{ document.fileType }}
            </AppBadge>
          </span>

          <span
            v-if="document.description"
            class="mt-1 block text-xs leading-relaxed text-pretty text-muted-fg"
          >
            {{ document.description }}
          </span>
        </span>

        <AppIcon
          name="arrow-up-right"
          :size="15"
          class="mt-0.5 shrink-0 text-faint rtl:-scale-x-100"
        />
      </a>
    </li>
  </ul>
</template>
