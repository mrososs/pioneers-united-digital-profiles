<script setup lang="ts">
import type { PublicProfileLink } from '#shared/types/profile'

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
 */
defineProps<{
  links: PublicProfileLink[]
}>()

const { t, te } = useI18n()

function labelFor(link: PublicProfileLink): string {
  if (link.label) return link.label

  const key = `profile.actions.${link.type}`
  return te(key) ? t(key) : link.type
}

function isExternal(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}
</script>

<template>
  <section
    v-if="links.length > 0"
    class="flex flex-col gap-3"
  >
    <h2 class="text-sm font-medium text-muted-fg">
      {{ t('profile.sections.links') }}
    </h2>

    <ul class="flex flex-col gap-2">
      <li
        v-for="link in links"
        :key="link.id"
      >
        <a
          :href="link.url"
          :target="isExternal(link.url) ? '_blank' : undefined"
          :rel="isExternal(link.url) ? 'noopener noreferrer' : undefined"
          class="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3
                 text-sm text-foreground transition-colors hover:bg-surface-hover
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span class="truncate">{{ labelFor(link) }}</span>
          <span
            class="shrink-0 text-muted-fg ltr:rotate-0 rtl:rotate-180"
            aria-hidden="true"
          >&rsaquo;</span>
        </a>
      </li>
    </ul>
  </section>
</template>
