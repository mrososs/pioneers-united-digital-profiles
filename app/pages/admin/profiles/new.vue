<script setup lang="ts">
import type { Organization } from '#shared/types/organization'
import type { Profile } from '#shared/types/profile'

/**
 * Create a profile.
 *
 * The organization comes from the server (`/api/admin/organization`), which resolves it
 * from the session. Reading it from runtime config or a query parameter would let a client
 * nominate someone else's tenant — the server would reject it, but the UI should not be
 * built to ask.
 */
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

const { t } = useI18n()
const localePath = useLocalePath()

const { data: organization } = await useFetch<Organization>('/api/admin/organization')

const { execute, pending, errorMessage, fieldErrors } = useAsyncAction(
  async (payload: Record<string, unknown>) => {
    const created = await $fetch<Profile>('/api/admin/profiles', {
      method: 'POST',
      body: payload,
    })

    await navigateTo(localePath(`/admin/profiles/${created.id}`))

    return created
  },
)

useSeoMeta({
  title: () => t('admin.profiles.newTitle'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader :title="t('admin.profiles.newTitle')" />

    <AdminProfileForm
      v-if="organization"
      :organization-id="organization.id"
      :pending="pending"
      :error-message="errorMessage"
      :field-errors="fieldErrors"
      :submit-label="t('common.actions.create')"
      @submit="execute"
    >
      <template #secondary-actions>
        <AppButton
          :to="localePath('/admin/profiles')"
          variant="ghost"
        >
          {{ t('common.actions.cancel') }}
        </AppButton>
      </template>
    </AdminProfileForm>

    <div
      v-else
      role="status"
      class="flex flex-col gap-3"
    >
      <AppSkeleton
        variant="title"
        width="40%"
      />
      <AppSkeleton variant="block" />
    </div>
  </div>
</template>
