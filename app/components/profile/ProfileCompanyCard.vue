<script setup lang="ts">
import type { OrganizationSummary } from '#shared/types/organization'

/**
 * The organization block shown at the foot of an individual profile.
 *
 * Links to the company's own Digital Profile via `localePath`, so it stays inside the
 * visitor's language. Because the company profile is an ordinary profile row, that is
 * simply its slug — there is no separate company route to keep in step.
 */
const props = defineProps<{
  organization: OrganizationSummary
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const companyPath = computed(() => localePath(`/${props.organization.slug}`))
</script>

<template>
  <AppCard>
    <div class="flex items-center gap-4">
      <img
        v-if="organization.logoUrl"
        :src="organization.logoUrl"
        :alt="t('profile.logoAlt', { organization: organization.name })"
        class="size-12 shrink-0 rounded-md object-contain"
        loading="lazy"
        decoding="async"
      >

      <div class="min-w-0 flex-1">
        <h2 class="truncate text-sm font-semibold text-foreground">
          {{ organization.name }}
        </h2>

        <p
          v-if="organization.tagline"
          class="truncate text-xs text-muted-fg"
        >
          {{ organization.tagline }}
        </p>

        <p
          v-else-if="organization.address"
          class="truncate text-xs text-muted-fg"
        >
          {{ organization.address }}
        </p>
      </div>

      <AppButton
        :to="companyPath"
        variant="ghost"
        size="sm"
      >
        {{ t('profile.sections.company') }}
      </AppButton>
    </div>
  </AppCard>
</template>
