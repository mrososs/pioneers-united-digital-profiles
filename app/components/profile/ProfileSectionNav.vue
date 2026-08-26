<script setup lang="ts">
import type { ProfileSectionNavItem } from '~/composables/useProfileSections'

/**
 * Sticky navigation across a profile's sections.
 *
 * WHY IT EXISTS
 *   A profile used to be two screens. With structured content it can be six, and
 *   a reader who scanned the metrics band needs a way to reach the credentials
 *   without thumbing past the whole career history.
 *
 * IT HAS TO WORK ON A PHONE
 *   The reference microsite this pattern comes from simply drops its anchors below
 *   768px — acceptable for a desktop deal room, useless here, where the page is
 *   opened from a QR code on a business card. So the bar is a horizontally
 *   scrollable row at every width rather than a centred set that collapses.
 *
 *   `scrollbar-width: none` hides the scroll affordance on the platforms that draw
 *   one; the row is still scrollable by touch, wheel and keyboard, and the active
 *   pill is scrolled into view as the reader moves down the page, so the current
 *   position is never off-screen.
 *
 * NATIVE ANCHORS, NOT SCRIPTED SCROLLING
 *   Each item is a real `<a href="#...">`. Smooth scrolling and the offset are CSS
 *   (`scroll-behavior`, `scroll-mt` on the shell), so the navigation still works
 *   with JavaScript unavailable and honours `prefers-reduced-motion` without a
 *   branch. The observer below only decorates.
 */
const props = defineProps<{
  items: ProfileSectionNavItem[]
}>()

const { activeAnchor } = useActiveSection(() => props.items.map(item => item.anchor))

const listRef = useTemplateRef<HTMLElement>('list')

/**
 * Keeps the highlighted pill visible as the reader scrolls the page. Without it
 * the bar silently highlights something off to one side on a narrow screen.
 */
watch(activeAnchor, (anchor) => {
  if (!anchor) return

  const active = listRef.value?.querySelector<HTMLElement>(`[data-anchor="${anchor}"]`)
  active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
})
</script>

<template>
  <nav
    class="pu-sticky-bar -mx-5 border-b border-border px-5 lg:-mx-10 lg:px-10"
    :aria-label="$t('profile.sections.navLabel')"
  >
    <ul
      ref="list"
      class="flex gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <li
        v-for="item in items"
        :key="item.anchor"
        class="shrink-0"
      >
        <a
          :href="`#${item.anchor}`"
          :data-anchor="item.anchor"
          :aria-current="activeAnchor === item.anchor ? 'true' : undefined"
          class="block rounded-xs px-3 py-1.5 text-xs whitespace-nowrap transition-colors duration-[160ms] ease-standard
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          :class="activeAnchor === item.anchor
            ? 'bg-muted font-semibold text-heading'
            : 'text-muted-fg hover:text-heading'"
        >
          {{ item.label }}
        </a>
      </li>
    </ul>
  </nav>
</template>
