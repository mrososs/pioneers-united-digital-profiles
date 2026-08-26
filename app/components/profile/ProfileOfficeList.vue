<script setup lang="ts">
import type { PublicOfficeItem } from '#shared/types/profile-section'

/**
 * Offices and locations.
 *
 * The organisation record carries exactly one address, which is why this exists:
 * a company with a head office and two regional branches had nowhere to say so.
 *
 * MAP DEEP LINKS
 *   Each office links out to its own map pin, the way the reference microsite
 *   links every parcel to Google Maps. The link is on an explicit "Directions"
 *   control rather than on the whole card: the card also carries a `tel:` link,
 *   and nesting two destinations inside one clickable surface is ambiguous to a
 *   pointer and invalid to a screen reader.
 */
defineProps<{
  items: PublicOfficeItem[]
}>()

const { t } = useI18n()
</script>

<template>
  <ul class="grid gap-3 sm:grid-cols-2">
    <li
      v-for="(office, index) in items"
      :key="index"
    >
      <AppCard
        as="article"
        padding="sm"
        class="flex h-full flex-col gap-2"
      >
        <h3
          v-if="office.name"
          class="flex items-center gap-2 text-sm font-semibold text-heading"
        >
          <AppIcon
            name="map-pin"
            :size="15"
            class="shrink-0 text-accent"
          />
          {{ office.name }}
        </h3>

        <p
          v-if="office.address"
          class="text-xs leading-relaxed text-pretty text-body"
        >
          {{ office.address }}
        </p>

        <div class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
          <a
            v-if="office.phone"
            :href="`tel:${office.phone}`"
            class="pu-num inline-flex items-center gap-1.5 rounded-xs text-xs text-body
                   hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <AppIcon
              name="phone"
              :size="14"
              class="shrink-0"
            />
            {{ office.phone }}
          </a>

          <a
            v-if="office.mapUrl"
            :href="office.mapUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 rounded-xs text-xs font-semibold text-accent
                   hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {{ t('profile.actions.directions') }}
            <AppIcon
              name="arrow-up-right"
              :size="14"
              class="shrink-0 rtl:-scale-x-100"
            />
          </a>
        </div>
      </AppCard>
    </li>
  </ul>
</template>
