<script setup lang="ts">
import type { OrganizationSummary } from '#shared/types/organization'

/**
 * The organization block shown at the foot of an individual profile.
 *
 * Links to the company's own Digital Profile via `localePath`, so it stays inside the
 * visitor's language. Because the company profile is an ordinary profile row, that is
 * simply its slug — there is no separate company route to keep in step.
 *
 * DESIGN SYSTEM
 *   The logo sits on a square 2px plate, matching the portrait treatment — the
 *   architectural note the system applies to every image. The bronze `accent`
 *   badge is the company marker; it is the one non-status use of a pill.
 */
const props = defineProps<{
  organization: OrganizationSummary
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const companyPath = computed(() => localePath(`/${props.organization.slug}`))
const secondaryLine = computed(() => props.organization.tagline ?? props.organization.address)
</script>

<template>
  <section class="flex flex-col gap-3">
    <h2 class="pu-eyebrow text-muted-fg">
      {{ t('profile.sections.company') }}
    </h2>

    <AppCard padding="none">
      <NuxtLink
        :to="companyPath"
        class="flex items-center gap-4 rounded-lg p-5
               transition-colors duration-[160ms] ease-standard hover:bg-surface-hover
               focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <img
          v-if="organization.logoUrl"
          :src="organization.logoUrl"
          :alt="t('profile.logoAlt', { organization: organization.name })"
          class="size-12 shrink-0 rounded-xs object-contain"
          loading="lazy"
          decoding="async"
        >
        <span
          v-else
          class="grid size-12 shrink-0 place-items-center rounded-xs bg-primary text-primary-fg"
          aria-hidden="true"
        >
          <AppIcon
            name="building-2"
            :size="20"
          />
        </span>

        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2">
            <span class="truncate text-sm font-semibold text-heading">
              {{ organization.name }}
            </span>
            <AppBadge
              tone="accent"
              size="sm"
            >
              {{ t('profile.sections.companyBadge') }}
            </AppBadge>
          </span>

          <span
            v-if="secondaryLine"
            class="mt-0.5 block truncate text-2xs text-muted-fg"
          >
            {{ secondaryLine }}
          </span>
        </span>

        <AppIcon
          name="chevron-right"
          :size="17"
          class="text-faint rtl:rotate-180"
        />
      </NuxtLink>
    </AppCard>
  </section>
</template>
