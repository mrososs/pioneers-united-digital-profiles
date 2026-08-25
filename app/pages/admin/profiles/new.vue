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
 *
 * PHOTO
 *   `AdminProfileForm` stages a chosen file locally (there is no profile id yet to derive
 *   the object key from) and hands it back on submit as `payload.photoFile`. Once the row
 *   exists here, it is uploaded and PATCHed onto that profile before navigating away. If the
 *   upload itself fails, the profile has still been created — the page navigates on anyway
 *   rather than leaving a duplicate-slug retry trap, and flags the failure via a query
 *   param the edit page surfaces as an alert (see `pages/admin/profiles/[id]/edit.vue`).
 */
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const { uploadProfilePhoto } = useProfilePhotoUpload()
const { scrollToTop } = useScrollToTop()

const { data: organization } = await useFetch<Organization>('/api/admin/organization')

const { execute, pending, errorMessage, fieldErrors } = useAsyncAction(
  async (payload: Record<string, unknown>) => {
    const { photoFile, ...body } = payload as Record<string, unknown> & { photoFile?: File }

    const created = await $fetch<Profile>('/api/admin/profiles', {
      method: 'POST',
      body,
    })

    let photoUploadFailed = false
    if (photoFile instanceof File) {
      try {
        await uploadProfilePhoto(created.id, photoFile)
      }
      catch {
        photoUploadFailed = true
      }
    }

    await navigateTo({
      path: localePath(`/admin/profiles/${created.id}`),
      query: photoUploadFailed ? { photoError: '1' } : undefined,
    })

    return created
  },
)

async function onSubmit(payload: Record<string, unknown>) {
  await execute(payload)
  scrollToTop()
}

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
      @submit="onSubmit"
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
