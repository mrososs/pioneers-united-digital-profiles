<script setup lang="ts">
import type { SelectOption } from '~/components/app/AppSelect.vue'
import { PROFILE_STATUSES, PROFILE_TYPES } from '#shared/constants/profiles'
import { STORAGE_BUCKETS, isAllowedMimeType, isWithinSizeLimit } from '#shared/constants/storage'
import type { Profile } from '#shared/types/profile'

/**
 * Create / edit form for a profile.
 *
 * SCOPE
 *   The bilingual identity, role and contact fields — the write path that everything else
 *   depends on. The extra-links editor has a working server endpoint (`links` on the
 *   profile payload) but no UI yet.
 *
 * PHOTO
 *   Upload requires a profile id (the object key is `profiles/<id>/photo-*`), so it is
 *   only available in edit mode — a profile must exist before it can carry a photo. It
 *   uploads and PATCHes `photoPath` immediately on selection rather than waiting for the
 *   form's own submit, since the file is already durably stored the moment the upload
 *   endpoint returns; leaving it stranded until "Save changes" would just be a second
 *   place the save could be forgotten.
 *
 * VALIDATION
 *   Client-side errors come from the server response, keyed by field path, and are
 *   rendered inline by AppFormField. The form does not pre-validate with Zod on every
 *   keystroke: the server is the authority, its schema is the same one, and duplicating
 *   the pass here would create two places for the rules to drift.
 *
 * PAIRED LANGUAGE FIELDS
 *   English and Arabic sit side by side rather than behind tabs, so an editor can see that
 *   a job title has been translated at all. Each input uses `dir="auto"`, so the Arabic
 *   field reads correctly even on the English page.
 */
const props = defineProps<{
  /** Present when editing; absent when creating. */
  profile?: Profile | null
  organizationId: string
  pending?: boolean
  errorMessage?: string | null
  fieldErrors?: Record<string, string>
  submitLabel: string
}>()

const emit = defineEmits<{
  submit: [payload: Record<string, unknown>]
  /** The photo changed independently of the form's own submit — see PHOTO above. */
  'photo-updated': []
}>()

const { t } = useI18n()
const { upload } = useMediaUpload()

/** Local draft. Seeded from the profile when editing, empty when creating. */
const form = reactive({
  slug: props.profile?.slug ?? '',
  profileType: props.profile?.profileType ?? 'individual',
  status: props.profile?.status ?? 'draft',
  nameEn: props.profile?.nameEn ?? '',
  nameAr: props.profile?.nameAr ?? '',
  jobTitleEn: props.profile?.jobTitleEn ?? '',
  jobTitleAr: props.profile?.jobTitleAr ?? '',
  departmentEn: props.profile?.departmentEn ?? '',
  departmentAr: props.profile?.departmentAr ?? '',
  bioEn: props.profile?.bioEn ?? '',
  bioAr: props.profile?.bioAr ?? '',
  locationEn: props.profile?.locationEn ?? '',
  locationAr: props.profile?.locationAr ?? '',
  email: props.profile?.email ?? '',
  phone: props.profile?.phone ?? '',
  whatsapp: props.profile?.whatsapp ?? '',
  linkedinUrl: props.profile?.linkedinUrl ?? '',
  websiteUrl: props.profile?.websiteUrl ?? '',
})

const localPhotoUrl = shallowRef<string | null>(props.profile?.photoUrl ?? null)

watch(() => props.profile?.photoUrl, (value) => {
  localPhotoUrl.value = value ?? null
})

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

/** Mimics `ApiErrorPayload` so `useApiError` renders it exactly like a server rejection. */
function clientValidationError(messageKey: string) {
  return { data: { code: 'validation_error', messageKey } }
}

const {
  execute: uploadPhoto,
  pending: photoPending,
  errorMessage: photoErrorMessage,
} = useAsyncAction(async (file: File) => {
  const profileId = props.profile?.id
  if (!profileId) return

  if (!isAllowedMimeType(STORAGE_BUCKETS.profileMedia, file.type)) {
    throw clientValidationError('validation.fileType')
  }
  if (!isWithinSizeLimit(STORAGE_BUCKETS.profileMedia, file.size)) {
    throw clientValidationError('validation.fileTooLarge')
  }

  const uploaded = await upload(file, 'profile-photo', profileId)
  await $fetch(`/api/admin/profiles/${profileId}`, { method: 'PATCH', body: { photoPath: uploaded.path } })

  localPhotoUrl.value = uploaded.url
  emit('photo-updated')
})

const {
  execute: removePhoto,
  pending: removePhotoPending,
  errorMessage: removePhotoErrorMessage,
} = useAsyncAction(async () => {
  const profileId = props.profile?.id
  if (!profileId) return

  await $fetch(`/api/admin/profiles/${profileId}`, { method: 'PATCH', body: { photoPath: null } })

  localPhotoUrl.value = null
  emit('photo-updated')
})

function onPhotoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Reset so choosing the same file again still fires a change event.
  input.value = ''
  if (file) uploadPhoto(file)
}

const typeOptions = computed<SelectOption[]>(() =>
  PROFILE_TYPES.map(value => ({ value, label: t(`admin.profileType.${value}`) })),
)

const statusOptions = computed<SelectOption[]>(() =>
  PROFILE_STATUSES.map(value => ({ value, label: t(`admin.profileStatus.${value}`) })),
)

function errorFor(field: string): string | undefined {
  return props.fieldErrors?.[field]
}

function onSubmit() {
  // Empty strings are sent as-is: the shared Zod schema normalises them to null, so the
  // "cleared a field" case has exactly one meaning on the server.
  emit('submit', {
    organizationId: props.organizationId,
    ...form,
  })
}
</script>

<template>
  <form
    class="flex flex-col gap-8"
    novalidate
    @submit.prevent="onSubmit"
  >
    <AppAlert
      v-if="errorMessage"
      tone="danger"
    >
      {{ errorMessage }}
    </AppAlert>

    <!-- Publishing ------------------------------------------------------- -->
    <fieldset class="flex flex-col gap-4">
      <legend class="text-sm font-semibold text-foreground">
        {{ t('admin.profileForm.sections.publishing') }}
      </legend>

      <div class="grid gap-4 sm:grid-cols-2">
        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.slug')"
          :hint="t('admin.profileForm.fields.slugHint')"
          :error="errorFor('slug')"
          required
        >
          <AppInput
            :id="id"
            v-model="form.slug"
            dir="ltr"
            :invalid="invalid"
            :described-by="describedBy"
            :maxlength="80"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.status')"
          :error="errorFor('status')"
        >
          <AppSelect
            :id="id"
            v-model="form.status"
            :options="statusOptions"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.profileType')"
          :error="errorFor('profileType')"
        >
          <AppSelect
            :id="id"
            v-model="form.profileType"
            :options="typeOptions"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>
      </div>
    </fieldset>

    <!-- Photo ------------------------------------------------------------ -->
    <fieldset class="flex flex-col gap-4">
      <legend class="text-sm font-semibold text-foreground">
        {{ t('admin.profileForm.sections.media') }}
      </legend>

      <template v-if="profile">
        <div class="flex items-center gap-4">
          <AppAvatar
            :src="localPhotoUrl"
            :name="form.nameEn || form.nameAr"
            size="xl"
          />

          <div class="flex flex-col gap-2">
            <div class="flex flex-wrap gap-2">
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                :loading="photoPending"
                @click="fileInput?.click()"
              >
                {{ t('common.actions.upload') }}
              </AppButton>

              <AppButton
                v-if="localPhotoUrl"
                type="button"
                variant="ghost"
                size="sm"
                :loading="removePhotoPending"
                @click="removePhoto()"
              >
                {{ t('common.actions.remove') }}
              </AppButton>
            </div>

            <p class="text-xs text-muted-fg">
              {{ t('admin.profileForm.fields.photoHint') }}
            </p>
          </div>

          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            class="sr-only"
            :aria-label="t('admin.profileForm.fields.photo')"
            @change="onPhotoSelected"
          >
        </div>

        <AppAlert
          v-if="photoErrorMessage || removePhotoErrorMessage"
          tone="danger"
        >
          {{ photoErrorMessage || removePhotoErrorMessage }}
        </AppAlert>
      </template>

      <p
        v-else
        class="text-sm text-muted-fg"
      >
        {{ t('admin.profileForm.photoCreateHint') }}
      </p>
    </fieldset>

    <!-- Identity -------------------------------------------------------- -->
    <fieldset class="flex flex-col gap-4">
      <legend class="text-sm font-semibold text-foreground">
        {{ t('admin.profileForm.sections.identity') }}
      </legend>

      <div class="grid gap-4 sm:grid-cols-2">
        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.nameEn')"
          :error="errorFor('nameEn')"
          required
        >
          <AppInput
            :id="id"
            v-model="form.nameEn"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.nameAr')"
          :error="errorFor('nameAr')"
          required
        >
          <AppInput
            :id="id"
            v-model="form.nameAr"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>
      </div>
    </fieldset>

    <!-- Role ------------------------------------------------------------ -->
    <fieldset class="flex flex-col gap-4">
      <legend class="text-sm font-semibold text-foreground">
        {{ t('admin.profileForm.sections.role') }}
      </legend>

      <div class="grid gap-4 sm:grid-cols-2">
        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.jobTitleEn')"
          :error="errorFor('jobTitleEn')"
        >
          <AppInput
            :id="id"
            v-model="form.jobTitleEn"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.jobTitleAr')"
          :error="errorFor('jobTitleAr')"
        >
          <AppInput
            :id="id"
            v-model="form.jobTitleAr"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.departmentEn')"
          :error="errorFor('departmentEn')"
        >
          <AppInput
            :id="id"
            v-model="form.departmentEn"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.departmentAr')"
          :error="errorFor('departmentAr')"
        >
          <AppInput
            :id="id"
            v-model="form.departmentAr"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>
      </div>
    </fieldset>

    <!-- Contact --------------------------------------------------------- -->
    <fieldset class="flex flex-col gap-4">
      <legend class="text-sm font-semibold text-foreground">
        {{ t('admin.profileForm.sections.contact') }}
      </legend>

      <div class="grid gap-4 sm:grid-cols-2">
        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.email')"
          :error="errorFor('email')"
        >
          <AppInput
            :id="id"
            v-model="form.email"
            type="email"
            inputmode="email"
            dir="ltr"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.phone')"
          :hint="t('admin.profileForm.fields.phoneHint')"
          :error="errorFor('phone')"
        >
          <AppInput
            :id="id"
            v-model="form.phone"
            type="tel"
            inputmode="tel"
            dir="ltr"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.whatsapp')"
          :error="errorFor('whatsapp')"
        >
          <AppInput
            :id="id"
            v-model="form.whatsapp"
            type="tel"
            inputmode="tel"
            dir="ltr"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.linkedinUrl')"
          :error="errorFor('linkedinUrl')"
        >
          <AppInput
            :id="id"
            v-model="form.linkedinUrl"
            type="url"
            inputmode="url"
            dir="ltr"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.websiteUrl')"
          :error="errorFor('websiteUrl')"
        >
          <AppInput
            :id="id"
            v-model="form.websiteUrl"
            type="url"
            inputmode="url"
            dir="ltr"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.locationEn')"
          :error="errorFor('locationEn')"
        >
          <AppInput
            :id="id"
            v-model="form.locationEn"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.locationAr')"
          :error="errorFor('locationAr')"
        >
          <AppInput
            :id="id"
            v-model="form.locationAr"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>
      </div>
    </fieldset>

    <!-- Content --------------------------------------------------------- -->
    <fieldset class="flex flex-col gap-4">
      <legend class="text-sm font-semibold text-foreground">
        {{ t('admin.profileForm.sections.content') }}
      </legend>

      <div class="grid gap-4 sm:grid-cols-2">
        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.bioEn')"
          :error="errorFor('bioEn')"
        >
          <AppTextarea
            :id="id"
            v-model="form.bioEn"
            :rows="6"
            :maxlength="2000"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.bioAr')"
          :error="errorFor('bioAr')"
        >
          <AppTextarea
            :id="id"
            v-model="form.bioAr"
            :rows="6"
            :maxlength="2000"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>
      </div>
    </fieldset>

    <div class="flex flex-wrap gap-3">
      <AppButton
        type="submit"
        :loading="pending"
      >
        {{ submitLabel }}
      </AppButton>

      <slot name="secondary-actions" />
    </div>
  </form>
</template>
