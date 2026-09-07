<script setup lang="ts">
import type { SelectOption } from '~/components/app/AppSelect.vue'
import { PROFILE_STATUSES, PROFILE_TYPES } from '#shared/constants/profiles'
import { STORAGE_BUCKETS, isAllowedMimeType, isWithinSizeLimit } from '#shared/constants/storage'
import type { Profile } from '#shared/types/profile'
import type { SectionFormEntry } from '~/utils/profile-section-form'
import { toSectionFormEntry, toSectionSubmit } from '~/utils/profile-section-form'

/**
 * Create / edit form for a profile.
 *
 * SCOPE
 *   The bilingual identity, role, contact and structured-content fields. The extra-links
 *   editor (`links` on the profile payload) has a working server endpoint but no UI yet.
 *
 * PUBLIC LINK
 *   The slug is generated server-side from the English name plus a random suffix (see
 *   `createProfile` in profile.service.ts) and is never typed by an administrator — it is
 *   printed on business cards and encoded in QR codes, so removing the manual field also
 *   removes the chance of a typo becoming permanent. The assigned link is shown read-only
 *   on the profile detail page once the row exists.
 *
 * PHOTO
 *   In edit mode, upload requires a profile id (the object key is `profiles/<id>/photo-*`)
 *   and PATCHes `photoPath` immediately on selection rather than waiting for the form's own
 *   submit, since the file is already durably stored the moment the upload endpoint returns.
 *   In create mode there is no id yet, so the file is only staged here (validated and held
 *   as a local preview) and the page uploads it right after the new row is inserted — see
 *   `pages/admin/profiles/new.vue`.
 *
 * VALIDATION
 *   Client-side errors come from the server response, keyed by field path, and are
 *   rendered inline by AppFormField. The form does not pre-validate with Zod on every
 *   keystroke: the server is the authority, its schema is the same one, and duplicating
 *   the pass here would create two places for the rules to drift. When a submit comes back
 *   with field errors the form scrolls to and focuses the first invalid control, since a
 *   banner at the top of a long form does not by itself say which field to fix.
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
  'submit': [payload: Record<string, unknown>]
  /** The photo changed independently of the form's own submit — see PHOTO above. */
  'photo-updated': []
}>()

const { t } = useI18n()
const { uploadProfilePhoto } = useProfilePhotoUpload()

/** Local draft. Seeded from the profile when editing, empty when creating. */
const form = reactive({
  profileType: props.profile?.profileType ?? 'individual',
  status: props.profile?.status ?? 'draft',
  nameEn: props.profile?.nameEn ?? '',
  nameAr: props.profile?.nameAr ?? '',
  jobTitleEn: props.profile?.jobTitleEn ?? '',
  jobTitleAr: props.profile?.jobTitleAr ?? '',
  departmentEn: props.profile?.departmentEn ?? '',
  departmentAr: props.profile?.departmentAr ?? '',
  headlineEn: props.profile?.headlineEn ?? '',
  headlineAr: props.profile?.headlineAr ?? '',
  bioEn: props.profile?.bioEn ?? '',
  bioAr: props.profile?.bioAr ?? '',
  locationEn: props.profile?.locationEn ?? '',
  locationAr: props.profile?.locationAr ?? '',
  email: props.profile?.email ?? '',
  phone: props.profile?.phone ?? '',
  whatsapp: props.profile?.whatsapp ?? '',
  linkedinUrl: props.profile?.linkedinUrl ?? '',
  websiteUrl: props.profile?.websiteUrl ?? '',
  bookingUrl: props.profile?.bookingUrl ?? '',
  sections: (props.profile?.sections ?? []).map(toSectionFormEntry) as SectionFormEntry[],
})

const localPhotoUrl = shallowRef<string | null>(props.profile?.photoUrl ?? null)

watch(() => props.profile?.photoUrl, (value) => {
  localPhotoUrl.value = value ?? null
})

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

const {
  execute: uploadPhoto,
  pending: photoPending,
  errorMessage: photoErrorMessage,
} = useAsyncAction(async (file: File) => {
  const profileId = props.profile?.id
  if (!profileId) return

  localPhotoUrl.value = await uploadProfilePhoto(profileId, file)
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

/** Staged file for create mode — see PHOTO above. Validated but not yet uploaded. */
const photoFile = shallowRef<File | null>(null)
const photoFilePreviewUrl = shallowRef<string | null>(null)
const photoFileError = shallowRef<string | null>(null)

function revokePhotoFilePreview() {
  if (photoFilePreviewUrl.value) URL.revokeObjectURL(photoFilePreviewUrl.value)
}

function onPhotoFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (!isAllowedMimeType(STORAGE_BUCKETS.profileMedia, file.type)) {
    photoFileError.value = t('validation.fileType')
    return
  }
  if (!isWithinSizeLimit(STORAGE_BUCKETS.profileMedia, file.size)) {
    photoFileError.value = t('validation.fileTooLarge')
    return
  }

  photoFileError.value = null
  revokePhotoFilePreview()
  photoFile.value = file
  photoFilePreviewUrl.value = URL.createObjectURL(file)
}

function clearPhotoFile() {
  revokePhotoFilePreview()
  photoFile.value = null
  photoFilePreviewUrl.value = null
}

onBeforeUnmount(revokePhotoFilePreview)

const typeOptions = computed<SelectOption[]>(() =>
  PROFILE_TYPES.map(value => ({ value, label: t(`admin.profileType.${value}`) })),
)

const statusOptions = computed<SelectOption[]>(() =>
  PROFILE_STATUSES.map(value => ({ value, label: t(`admin.profileStatus.${value}`) })),
)

function errorFor(field: string): string | undefined {
  return props.fieldErrors?.[field]
}

/**
 * A rejected submit renders each bad field's message inline (via `aria-invalid`,
 * wired through AppFormField/AppInput), but on a form this long that message can sit
 * well below the fold. Scrolling to and focusing the first invalid control is what
 * actually tells the administrator where the problem is, rather than just that one
 * exists.
 */
const formRef = useTemplateRef<HTMLFormElement>('formRef')

watch(() => props.fieldErrors, (errors) => {
  if (!errors || Object.keys(errors).length === 0) return

  nextTick(() => {
    const invalidField = formRef.value?.querySelector<HTMLElement>('[aria-invalid="true"]')
    invalidField?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    invalidField?.focus()
  })
})

function onSubmit() {
  // Empty strings are sent as-is: the shared Zod schema normalises them to null, so the
  // "cleared a field" case has exactly one meaning on the server.
  const payload: Record<string, unknown> = {
    organizationId: props.organizationId,
    ...form,
    sections: form.sections.map(toSectionSubmit),
  }

  // Only meaningful on create — see PHOTO above. The page strips this key before
  // sending the rest of the payload to the API.
  if (!props.profile && photoFile.value) {
    payload.photoFile = photoFile.value
  }

  emit('submit', payload)
}
</script>

<template>
  <form
    ref="formRef"
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

      <template v-else>
        <div class="flex items-center gap-4">
          <AppAvatar
            :src="photoFilePreviewUrl"
            :name="form.nameEn || form.nameAr"
            size="xl"
          />

          <div class="flex flex-col gap-2">
            <div class="flex flex-wrap gap-2">
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                @click="fileInput?.click()"
              >
                {{ t('common.actions.upload') }}
              </AppButton>

              <AppButton
                v-if="photoFile"
                type="button"
                variant="ghost"
                size="sm"
                @click="clearPhotoFile()"
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
            @change="onPhotoFileSelected"
          >
        </div>

        <AppAlert
          v-if="photoFileError"
          tone="danger"
        >
          {{ photoFileError }}
        </AppAlert>
      </template>
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
          :label="t('admin.profileForm.fields.bookingUrl')"
          :error="errorFor('bookingUrl')"
        >
          <AppInput
            :id="id"
            v-model="form.bookingUrl"
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
          :label="t('admin.profileForm.fields.headlineEn')"
          :error="errorFor('headlineEn')"
        >
          <AppInput
            :id="id"
            v-model="form.headlineEn"
            :maxlength="240"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.profileForm.fields.headlineAr')"
          :error="errorFor('headlineAr')"
        >
          <AppInput
            :id="id"
            v-model="form.headlineAr"
            :maxlength="240"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

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

    <!-- Structured content ------------------------------------------------ -->
    <fieldset class="flex flex-col gap-4">
      <legend class="text-sm font-semibold text-foreground">
        {{ t('admin.profileForm.sections.structuredContent') }}
      </legend>

      <p class="text-xs text-muted-fg">
        {{ t('admin.profileForm.sections.structuredContentHint') }}
      </p>

      <AdminProfileSectionsEditor
        v-model="form.sections"
        :profile-type="form.profileType"
        :field-errors="fieldErrors"
      />
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
