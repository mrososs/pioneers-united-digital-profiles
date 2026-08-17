<script setup lang="ts">
import type { Profile } from '#shared/types/profile'

/**
 * Edit a profile.
 *
 * PATCHes the whole form, which the server treats as a partial update against the shared
 * schema. `organizationId` is not part of that schema, so an edit can never move a profile
 * between tenants — see server/api/admin/profiles/[id].patch.ts.
 */
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const profileId = computed(() => String(route.params.id ?? ''))

const { data: profile, refresh } = await useFetch<Profile>(
  () => `/api/admin/profiles/${profileId.value}`,
)

if (!profile.value) {
  throw createError({ statusCode: 404, statusMessage: 'not_found', fatal: true })
}

const saved = shallowRef(false)

const { execute, pending, errorMessage, fieldErrors } = useAsyncAction(
  async (payload: Record<string, unknown>) => {
    // organizationId is intentionally dropped: it is not an editable field.
    const { organizationId: _organizationId, ...body } = payload

    const updated = await $fetch<Profile>(`/api/admin/profiles/${profileId.value}`, {
      method: 'PATCH',
      body,
    })

    await refresh()
    saved.value = true

    return updated
  },
)

useSeoMeta({
  title: () => t('admin.profiles.editTitle'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      :title="t('admin.profiles.editTitle')"
      :description="profile?.slug"
    />

    <AppAlert
      v-if="saved && !errorMessage"
      tone="success"
    >
      {{ t('admin.profiles.updated') }}
    </AppAlert>

    <AdminProfileForm
      v-if="profile"
      :profile="profile"
      :organization-id="profile.organizationId"
      :pending="pending"
      :error-message="errorMessage"
      :field-errors="fieldErrors"
      :submit-label="t('common.actions.saveChanges')"
      @submit="execute"
    >
      <template #secondary-actions>
        <AppButton
          :to="localePath(`/admin/profiles/${profileId}`)"
          variant="ghost"
        >
          {{ t('common.actions.cancel') }}
        </AppButton>
      </template>
    </AdminProfileForm>
  </div>
</template>
