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
const router = useRouter()

const profileId = computed(() => String(route.params.id ?? ''))

const { data: profile, refresh } = await useFetch<Profile>(
  () => `/api/admin/profiles/${profileId.value}`,
)

if (!profile.value) {
  throw createError({ statusCode: 404, statusMessage: 'not_found', fatal: true })
}

const saved = shallowRef(false)
const { scrollToTop } = useScrollToTop()

/**
 * The create page lands here right after inserting the profile row. If the photo the
 * administrator staged there failed to upload, it flags that with `?photoError=1` instead
 * of blocking navigation — see PHOTO in `pages/admin/profiles/new.vue`. Surfaced once, then
 * scrubbed from the URL so a reload does not repeat it.
 */
const photoUploadFailedOnCreate = shallowRef(route.query.photoError === '1')

onMounted(() => {
  if (!photoUploadFailedOnCreate.value) return
  const { photoError: _photoError, ...query } = route.query
  router.replace({ query })
})

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

/** Scroll up after the request settles so the success or error alert above the form is visible. */
async function onSubmit(payload: Record<string, unknown>) {
  await execute(payload)
  scrollToTop()
}

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
      v-if="photoUploadFailedOnCreate"
      tone="danger"
    >
      {{ t('admin.profileForm.photoUploadFailedAfterCreate') }}
    </AppAlert>

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
      @submit="onSubmit"
      @photo-updated="refresh"
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
