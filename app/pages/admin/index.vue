<script setup lang="ts">
import type { ProfileListItem } from '#shared/types/profile'
import type { WalletProviderSummary } from '#shared/types/wallet'

/**
 * Dashboard overview.
 *
 * One request to /api/admin/overview supplies counts, recent profiles and wallet provider
 * status; splitting it into three would make the first paint three round trips deep for no
 * benefit.
 */
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

interface OverviewResponse {
  counts: { published: number, draft: number, inactive: number, total: number }
  recentProfiles: ProfileListItem[]
  wallet: WalletProviderSummary
}

const { t } = useI18n()
const localePath = useLocalePath()
const { session } = useAdminSession()
// `pick` reads the active locale during render, so template calls stay reactive without
// creating a computed per row.
const { pick } = useLocalizedField()

const { data, status } = await useFetch<OverviewResponse>('/api/admin/overview')

const welcomeSuffix = computed(() => {
  const name = session.value?.fullName
  return name ? `, ${name}` : ''
})

const stats = computed(() => [
  { key: 'total', label: t('admin.dashboard.totalProfiles'), value: data.value?.counts.total ?? 0 },
  { key: 'published', label: t('admin.dashboard.publishedProfiles'), value: data.value?.counts.published ?? 0 },
  { key: 'draft', label: t('admin.dashboard.draftProfiles'), value: data.value?.counts.draft ?? 0 },
])

useSeoMeta({
  title: () => t('admin.nav.dashboard'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader :title="t('admin.dashboard.welcome', { name: welcomeSuffix })">
      <template #actions>
        <AppButton
          :to="localePath('/admin/profiles/new')"
          size="sm"
        >
          {{ t('admin.dashboard.createProfile') }}
        </AppButton>
      </template>
    </AdminPageHeader>

    <div
      v-if="status === 'pending'"
      role="status"
      class="grid gap-4 sm:grid-cols-3"
    >
      <AppCard
        v-for="index in 3"
        :key="index"
      >
        <AppSkeleton
          variant="text"
          width="50%"
        />
        <AppSkeleton
          class="mt-3"
          variant="title"
          width="30%"
        />
      </AppCard>
    </div>

    <div
      v-else
      class="grid gap-4 sm:grid-cols-3"
    >
      <AppCard
        v-for="stat in stats"
        :key="stat.key"
      >
        <p class="text-sm text-muted-fg">
          {{ stat.label }}
        </p>
        <p class="mt-2 text-3xl font-semibold text-foreground">
          {{ stat.value }}
        </p>
      </AppCard>
    </div>

    <section class="flex flex-col gap-3">
      <h2 class="text-sm font-medium text-muted-fg">
        {{ t('admin.dashboard.recentlyUpdated') }}
      </h2>

      <AppEmptyState
        v-if="status !== 'pending' && (data?.recentProfiles.length ?? 0) === 0"
        :title="t('admin.profiles.empty')"
        :description="t('admin.profiles.emptyDescription')"
      >
        <template #action>
          <AppButton
            :to="localePath('/admin/profiles/new')"
            size="sm"
          >
            {{ t('admin.dashboard.createProfile') }}
          </AppButton>
        </template>
      </AppEmptyState>

      <ul
        v-else
        class="flex flex-col gap-2"
      >
        <AppCard
          v-for="profile in data?.recentProfiles ?? []"
          :key="profile.id"
          as="li"
          padding="sm"
        >
          <NuxtLink
            :to="localePath(`/admin/profiles/${profile.id}`)"
            class="flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <AppAvatar
              :src="profile.photoUrl"
              :name="pick(profile.nameEn, profile.nameAr) ?? profile.nameEn"
              size="md"
            />

            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-foreground">
                {{ pick(profile.nameEn, profile.nameAr) }}
              </span>
              <span
                class="block truncate text-xs text-muted-fg"
                dir="ltr"
              >
                /{{ profile.slug }}
              </span>
            </span>

            <AppBadge
              :tone="profile.status === 'published' ? 'success' : 'neutral'"
              size="sm"
            >
              {{ t(`admin.profileStatus.${profile.status}`) }}
            </AppBadge>
          </NuxtLink>
        </AppCard>
      </ul>
    </section>
  </div>
</template>
