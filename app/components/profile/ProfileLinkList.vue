<script setup lang="ts">
import type { PublicProfileLink } from '#shared/types/profile'
import type { IconName } from '~/utils/icons'
import type { ProfileLinkType } from '#shared/constants/profiles'

/**
 * The profile's extra links.
 *
 * Two safety properties worth stating:
 *   * Only enabled links of a published profile ever reach the client — enforced by RLS,
 *     then again by the public mapper. This component does no filtering of its own.
 *   * Every URL has passed a protocol allow-list (http/https/mailto/tel) in Zod and in a
 *     database CHECK, which is what makes it safe to bind to `href`. External links carry
 *     `rel="noopener noreferrer"`.
 *
 * The label falls back to the link type's translated name, so a link with no label still
 * reads sensibly instead of showing a bare URL.
 *
 * The trailing chevron is a directional glyph and flips under RTL. The rows are a
 * hairline-separated stack inside one card rather than separate cards, which is
 * how the design system draws a list of like items.
 *
 * The empty guard below is a safety net, not the primary check: `ProfileView`
 * already decides whether to render this block, because a component that can
 * render nothing cannot carry a runtime directive on its root.
 */
const props = defineProps<{
  links: PublicProfileLink[]
}>()

const { t, te } = useI18n()

/**
 * Glyph per link type. Anything unrecognised falls back to the generic link
 * mark rather than rendering nothing, so a new link type added server-side
 * degrades instead of breaking the row's alignment.
 */
const TYPE_ICON: Partial<Record<ProfileLinkType, IconName>> = {
  website: 'globe',
  linkedin: 'linkedin',
  whatsapp: 'whatsapp',
  instagram: 'instagram',
  telegram: 'message-circle',
  email: 'mail',
  phone: 'phone',
  location: 'map-pin',
}

function iconFor(link: PublicProfileLink): IconName {
  return TYPE_ICON[link.type] ?? 'link'
}

function labelFor(link: PublicProfileLink): string {
  if (link.label) return link.label

  const key = `profile.actions.${link.type}`
  return te(key) ? t(key) : link.type
}

function isExternal(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

const hasLinks = computed(() => props.links.length > 0)
</script>

<template>
  <section
    v-if="hasLinks"
    class="flex flex-col gap-3"
  >
    <h2 class="pu-eyebrow text-muted-fg">
      {{ t('profile.sections.links') }}
    </h2>

    <AppCard padding="none">
      <ul>
        <li
          v-for="(link, index) in links"
          :key="link.id"
          :class="index > 0 ? 'border-t border-border' : ''"
        >
          <a
            :href="link.url"
            :target="isExternal(link.url) ? '_blank' : undefined"
            :rel="isExternal(link.url) ? 'noopener noreferrer' : undefined"
            class="flex items-center gap-3 px-4 py-3.5 text-sm text-heading
                   transition-colors duration-[160ms] ease-standard hover:bg-surface-hover
                   focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <AppIcon
              :name="iconFor(link)"
              :size="17"
              class="text-muted-fg"
            />
            <span class="min-w-0 flex-1 truncate">{{ labelFor(link) }}</span>
            <AppIcon
              name="chevron-right"
              :size="16"
              class="text-faint rtl:rotate-180"
            />
          </a>
        </li>
      </ul>
    </AppCard>
  </section>
</template>
