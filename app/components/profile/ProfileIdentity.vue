<script setup lang="ts">
import type { PublicProfile } from '#shared/types/profile'

/**
 * Name, photograph, role and location — the top of a public profile.
 *
 * Presentational only: it receives an already locale-resolved `PublicProfile` and picks
 * nothing, fetches nothing and decides nothing. That is what lets the same component
 * serve an individual and a company profile.
 *
 * Mobile-first: the photograph and text stack and centre on a phone, and only widen to a
 * row from `sm` upwards. A public profile is opened from a WhatsApp message far more
 * often than from a desktop.
 */
const props = withDefaults(defineProps<{
  profile: PublicProfile
  /** `h1` on a profile page, `h2` when embedded in a wider page. */
  headingLevel?: 'h1' | 'h2'
}>(), {
  headingLevel: 'h1',
})

const { t } = useI18n()

const roleLine = computed(() => {
  const parts = [props.profile.jobTitle, props.profile.department].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
})
</script>

<template>
  <header class="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-start">
    <AppAvatar
      :src="profile.photoUrl"
      :name="profile.name"
      :alt="t('profile.photoAlt', { name: profile.name })"
      size="2xl"
      class="sm:size-24"
    />

    <div class="min-w-0">
      <component
        :is="headingLevel"
        class="text-2xl font-semibold text-balance text-foreground sm:text-3xl"
      >
        {{ profile.name }}
      </component>

      <p
        v-if="roleLine"
        class="mt-1.5 text-base text-muted-fg"
      >
        {{ roleLine }}
      </p>

      <p
        v-if="profile.location"
        class="mt-1 text-sm text-muted-fg"
      >
        {{ profile.location }}
      </p>
    </div>
  </header>
</template>
