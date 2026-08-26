<script setup lang="ts">
import type { PublicProfileSection } from '#shared/types/profile-section'
import { toPrintEntries } from '~/utils/profile-print'

/**
 * Structured content blocks, rendered for paper.
 *
 * NOT THE WEB RENDERERS
 *   `ProfileSectionList` and its nine components are built for a scrolling
 *   screen: cards, shadows, hover states, icon plates, a timeline rail. On A4
 *   every one of those costs ink or margin and buys nothing — the reader is not
 *   navigating, they are looking at a finished page. This follows the same
 *   decision `ProfilePrintView` already made for the profile as a whole: a
 *   purpose-built static layout rather than a print stylesheet fighting the
 *   interactive one.
 *
 * PAGE BREAKS
 *   Once a profile carries real content the PDF is no longer one page, and the
 *   default flow will happily split a credential across the fold or strand a
 *   heading alone at the bottom.
 *
 *   The avoidance is applied per ENTRY, not per section. Blocking a break inside
 *   a whole section reads as the safer choice and is not: a four-role career
 *   history that does not fit in the remainder of a page is then moved to the
 *   next one entire, leaving a third of the sheet blank. Keeping each entry whole
 *   and pinning the heading to whatever follows it gives the same protection
 *   against ugly splits while letting a long list flow across the fold, which is
 *   what paper is for.
 *
 * Links stay real anchors — Chromium preserves hrefs as clickable PDF links, so
 * a recipient reading the file can still open a document or a map pin.
 */
const props = defineProps<{
  sections: PublicProfileSection[]
}>()

const titleFor = useProfileSectionTitle()

/**
 * Paired up front rather than calling `toPrintEntries` from the template: the
 * template would re-run it on every render, and keeping derivation in script is
 * the house rule.
 */
const blocks = computed(() =>
  props.sections.map(section => ({
    section,
    title: titleFor(section),
    entries: toPrintEntries(section),
  })),
)
</script>

<template>
  <section
    v-for="block in blocks"
    :key="block.section.id"
    class="flex flex-col gap-2.5"
  >
    <h2 class="pu-eyebrow break-after-avoid text-muted-fg">
      {{ block.title }}
    </h2>

    <!-- Figures. A single row: on paper this is a summary line, not the
           four-tile band the screen version needs, and it is short enough to
           keep whole. -->
    <dl
      v-if="block.section.kind === 'metrics'"
      class="flex break-inside-avoid flex-wrap gap-x-10 gap-y-3"
    >
      <div
        v-for="(metric, index) in block.section.items"
        :key="index"
        class="flex flex-col-reverse gap-0.5"
      >
        <dt
          v-if="metric.label"
          class="text-2xs text-muted-fg"
        >
          {{ metric.label }}
        </dt>
        <dd
          v-if="metric.value"
          class="text-lg font-semibold tabular-nums text-heading"
        >
          {{ metric.value }}
        </dd>
      </div>
    </dl>

    <!-- Tags. Inline and separated, rather than a wrap of bordered chips:
           twelve outlined pills is a lot of ink for twelve words. -->
    <p
      v-else-if="block.section.kind === 'expertise'"
      class="text-sm leading-relaxed text-body"
    >
      <template
        v-for="(tag, index) in block.section.items"
        :key="index"
      >
        <span
          v-if="index > 0"
          aria-hidden="true"
          class="text-faint"
        > · </span>{{ tag.label }}
      </template>
    </p>

    <!-- Everything else. Three lines, dense, no card. -->
    <ul
      v-else
      class="flex flex-col gap-3"
    >
      <li
        v-for="(entry, index) in block.entries"
        :key="index"
        class="flex break-inside-avoid flex-col gap-0.5"
      >
        <p
          v-if="entry.primary"
          class="text-sm font-semibold text-heading"
        >
          {{ entry.primary }}
        </p>

        <!-- Phone numbers and URLs are isolated with `<bdi dir="ltr">`, not by
               putting `dir` on the paragraph. Without isolation an Arabic page
               re-orders the run and `+966…` prints as `966…+` — the wrong number
               to anyone copying it off the page. Setting `dir` on the paragraph
               would fix the ordering but also left-align it, stranding the phone
               under a right-aligned heading; `<bdi>` fixes the run and leaves the
               block alone. -->
        <p
          v-if="entry.secondary"
          class="text-xs text-muted-fg"
        >
          <a
            v-if="block.section.kind === 'documents'"
            :href="entry.secondary"
            class="break-all"
          ><bdi dir="ltr">{{ entry.secondary }}</bdi></a>
          <bdi
            v-else-if="entry.secondaryLtr"
            dir="ltr"
          >{{ entry.secondary }}</bdi>
          <template v-else>
            {{ entry.secondary }}
          </template>
        </p>

        <p
          v-if="entry.body"
          class="mt-0.5 text-sm leading-relaxed text-pretty text-body"
        >
          {{ entry.body }}
        </p>
      </li>
    </ul>
  </section>
</template>
