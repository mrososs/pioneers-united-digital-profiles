<script setup lang="ts">
import type { Profile } from '#shared/types/profile'

/**
 * Profile detail.
 *
 * Read-only summary plus the publish/unpublish action, which is the one state change that
 * matters most: it is the moment a profile becomes world-readable. It goes to a dedicated
 * endpoint (`/status`) with its own capability rather than through the general update route,
 * so publishing is auditable as a distinct act.
 */
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { pick } = useLocalizedField()
const { can } = useAdminSession()

const profileId = computed(() => String(route.params.id ?? ''))

const { data: profile, refresh } = await useFetch<Profile>(
  () => `/api/admin/profiles/${profileId.value}`,
)

if (!profile.value) {
  throw createError({ statusCode: 404, statusMessage: 'not_found', fatal: true })
}

const isPublished = computed(() => profile.value?.status === 'published')

const { execute: toggleStatus, pending: statusPending, errorMessage: statusError } = useAsyncAction(
  async () => {
    const nextStatus = isPublished.value ? 'draft' : 'published'

    await $fetch(`/api/admin/profiles/${profileId.value}/status`, {
      method: 'PATCH',
      body: { status: nextStatus },
    })

    await refresh()
  },
)

const publicPath = computed(() => (profile.value ? localePath(`/${profile.value.slug}`) : '/'))

const details = computed(() => {
  const current = profile.value
  if (!current) return []

  return [
    { label: t('admin.profileForm.fields.slug'), value: `/${current.slug}` },
    { label: t('admin.profileForm.fields.profileType'), value: t(`admin.profileType.${current.profileType}`) },
    { label: t('admin.profileForm.fields.jobTitleEn'), value: pick(current.jobTitleEn, current.jobTitleAr) },
    { label: t('admin.profileForm.fields.email'), value: current.email },
    { label: t('admin.profileForm.fields.phone'), value: current.phone },
    { label: t('admin.profileForm.fields.locationEn'), value: pick(current.locationEn, current.locationAr) },
  ]
})

useSeoMeta({
  title: () => pick(profile.value?.nameEn, profile.value?.nameAr) ?? t('admin.profiles.title'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div
    v-if="profile"
    class="flex flex-col gap-6"
  >
    <AdminPageHeader :title="pick(profile.nameEn, profile.nameAr) ?? profile.nameEn">
      <template #actions>
        <AppButton
          :to="localePath(`/admin/profiles/${profile.id}/edit`)"
          variant="secondary"
          size="sm"
        >
          {{ t('common.actions.edit') }}
        </AppButton>

        <AppButton
          v-if="can('profiles:publish')"
          size="sm"
          :loading="statusPending"
          @click="toggleStatus()"
        >
          {{ isPublished ? t('admin.profiles.unpublish') : t('admin.profiles.publish') }}
        </AppButton>
      </template>
    </AdminPageHeader>

    <AppAlert
      v-if="statusError"
      tone="danger"
    >
      {{ statusError }}
    </AppAlert>

    <div class="flex flex-wrap items-center gap-3">
      <AppBadge :tone="isPublished ? 'success' : 'neutral'">
        {{ t(`admin.profileStatus.${profile.status}`) }}
      </AppBadge>

      <AppButton
        v-if="isPublished"
        :href="publicPath"
        variant="ghost"
        size="sm"
      >
        {{ t('admin.profiles.viewPublic') }}
      </AppButton>
    </div>

    <AppCard>
      <dl class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="detail in details"
          :key="detail.label"
        >
          <dt class="text-xs text-muted-fg">
            {{ detail.label }}
          </dt>
          <dd class="mt-0.5 text-sm text-foreground">
            {{ detail.value || t('common.notAvailable') }}
          </dd>
        </div>
      </dl>
    </AppCard>

    <AppCard v-if="profile.links.length > 0">
      <h2 class="text-sm font-semibold text-foreground">
        {{ t('admin.profileForm.sections.links') }}
      </h2>

      <ul class="mt-3 flex flex-col gap-2">
        <li
          v-for="link in profile.links"
          :key="link.id"
          class="flex items-center justify-between gap-3 text-sm"
        >
          <span class="truncate">{{ pick(link.labelEn, link.labelAr) ?? link.type }}</span>
          <AppBadge
            :tone="link.enabled ? 'success' : 'neutral'"
            size="sm"
          >
            {{ link.enabled ? t('admin.profileForm.fields.linkEnabled') : t('common.states.empty') }}
          </AppBadge>
        </li>
      </ul>
    </AppCard>
  </div>
</template>
