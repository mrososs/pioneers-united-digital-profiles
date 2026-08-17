<script setup lang="ts">
/**
 * Settings hub.
 *
 * A plain index rather than a redirect, so the sidebar's "Settings" entry always lands
 * somewhere stable and the three areas are discoverable.
 */
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

const { t } = useI18n()
const localePath = useLocalePath()

const sections = computed(() => [
  {
    to: '/admin/settings/company',
    title: t('admin.settings.company.title'),
    description: t('admin.settings.company.description'),
  },
  {
    to: '/admin/settings/branding',
    title: t('admin.settings.branding.title'),
    description: t('admin.settings.branding.description'),
  },
  {
    to: '/admin/settings/integrations',
    title: t('admin.settings.integrations.title'),
    description: t('admin.settings.integrations.description'),
  },
])

useSeoMeta({
  title: () => t('admin.settings.title'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      :title="t('admin.settings.title')"
      :description="t('admin.settings.description')"
    />

    <ul class="grid gap-4 sm:grid-cols-2">
      <AppCard
        v-for="section in sections"
        :key="section.to"
        as="li"
        padding="sm"
      >
        <NuxtLink
          :to="localePath(section.to)"
          class="block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <h2 class="text-sm font-semibold text-foreground">
            {{ section.title }}
          </h2>
          <p class="mt-1 text-xs text-muted-fg">
            {{ section.description }}
          </p>
        </NuxtLink>
      </AppCard>
    </ul>
  </div>
</template>
