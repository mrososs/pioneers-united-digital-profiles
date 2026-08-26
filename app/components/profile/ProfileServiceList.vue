<script setup lang="ts">
import type { PublicServiceItem } from '#shared/types/profile-section'
import type { IconName } from '~/utils/icons'
import { ICON_NAMES } from '~/utils/icons'

/**
 * What a company does — its capabilities.
 *
 * ICON NAMES ARE UNTRUSTED
 *   `icon` arrives from a JSONB payload that an operator typed into a form. It is
 *   a string, not an `IconName`, and a typo must not reach `AppIcon` — its prop is
 *   a union, so an unknown key is both a type error and a silently missing glyph.
 *   `resolvedIcon` narrows against the real icon set and falls back, which means a
 *   mistyped key costs a generic glyph rather than a broken card.
 */
const props = defineProps<{
  items: PublicServiceItem[]
}>()

const FALLBACK_ICON: IconName = 'briefcase-business'

function isIconName(value: string): value is IconName {
  return (ICON_NAMES as readonly string[]).includes(value)
}

const resolved = computed(() =>
  props.items.map(item => ({
    ...item,
    iconName: item.icon && isIconName(item.icon) ? item.icon : FALLBACK_ICON,
  })),
)
</script>

<template>
  <ul class="grid gap-3 sm:grid-cols-2">
    <li
      v-for="(service, index) in resolved"
      :key="index"
    >
      <AppCard
        as="article"
        padding="sm"
        class="flex h-full flex-col gap-2"
      >
        <span class="grid size-9 place-items-center rounded-xs bg-accent-surface text-accent-hover">
          <AppIcon
            :name="service.iconName"
            :size="18"
          />
        </span>

        <h3
          v-if="service.title"
          class="text-sm font-semibold text-heading"
        >
          {{ service.title }}
        </h3>

        <p
          v-if="service.description"
          class="text-xs leading-relaxed text-pretty text-body"
        >
          {{ service.description }}
        </p>
      </AppCard>
    </li>
  </ul>
</template>
