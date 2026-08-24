<script setup lang="ts">
import type { Organization } from '#shared/types/organization'

/**
 * Company settings.
 *
 * Editing requires `organization:write` (super_admin), because these values appear on the
 * public company profile and inside every vCard the platform issues. An `admin` sees the
 * same screen read-only rather than a permission error — showing the data and disabling the
 * control is clearer than hiding the page.
 */
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

const { t } = useI18n()
const { can } = useAdminSession()

const { data: organization, refresh } = await useFetch<Organization>('/api/admin/organization')

const canEdit = computed(() => can('organization:write'))
const saved = shallowRef(false)

const form = reactive({
  nameEn: '',
  nameAr: '',
  taglineEn: '',
  taglineAr: '',
  website: '',
  email: '',
  phone: '',
  addressEn: '',
  addressAr: '',
})

watch(organization, (value) => {
  if (!value) return
  form.nameEn = value.nameEn
  form.nameAr = value.nameAr
  form.taglineEn = value.taglineEn ?? ''
  form.taglineAr = value.taglineAr ?? ''
  form.website = value.website ?? ''
  form.email = value.email ?? ''
  form.phone = value.phone ?? ''
  form.addressEn = value.addressEn ?? ''
  form.addressAr = value.addressAr ?? ''
}, { immediate: true })

const { execute: save, pending, errorMessage, fieldErrors } = useAsyncAction(async () => {
  await $fetch('/api/admin/organization', { method: 'PATCH', body: { ...form } })
  await refresh()
  saved.value = true
})

const { scrollToTop } = useScrollToTop()

/** Scroll up after the request settles so the success or error alert above the form is visible. */
async function onSubmit() {
  await save()
  scrollToTop()
}

useSeoMeta({
  title: () => t('admin.settings.company.title'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      :title="t('admin.settings.company.title')"
      :description="t('admin.settings.company.description')"
    />

    <AppAlert
      v-if="errorMessage"
      tone="danger"
    >
      {{ errorMessage }}
    </AppAlert>

    <AppAlert
      v-else-if="saved"
      tone="success"
    >
      {{ t('admin.settings.company.saved') }}
    </AppAlert>

    <AppAlert
      v-if="!canEdit"
      tone="info"
    >
      {{ t('errors.forbidden') }}
    </AppAlert>

    <form
      class="flex flex-col gap-6"
      novalidate
      @submit.prevent="onSubmit"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.settings.company.nameEn')"
          :error="fieldErrors.nameEn"
          required
        >
          <AppInput
            :id="id"
            v-model="form.nameEn"
            :readonly="!canEdit"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.settings.company.nameAr')"
          :error="fieldErrors.nameAr"
          required
        >
          <AppInput
            :id="id"
            v-model="form.nameAr"
            :readonly="!canEdit"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.settings.company.taglineEn')"
          :error="fieldErrors.taglineEn"
        >
          <AppInput
            :id="id"
            v-model="form.taglineEn"
            :readonly="!canEdit"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.settings.company.taglineAr')"
          :error="fieldErrors.taglineAr"
        >
          <AppInput
            :id="id"
            v-model="form.taglineAr"
            :readonly="!canEdit"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.settings.company.website')"
          :error="fieldErrors.website"
        >
          <AppInput
            :id="id"
            v-model="form.website"
            type="url"
            dir="ltr"
            :readonly="!canEdit"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.settings.company.email')"
          :error="fieldErrors.email"
        >
          <AppInput
            :id="id"
            v-model="form.email"
            type="email"
            dir="ltr"
            :readonly="!canEdit"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.settings.company.phone')"
          :error="fieldErrors.phone"
        >
          <AppInput
            :id="id"
            v-model="form.phone"
            type="tel"
            dir="ltr"
            :readonly="!canEdit"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.settings.company.addressEn')"
          :error="fieldErrors.addressEn"
        >
          <AppInput
            :id="id"
            v-model="form.addressEn"
            :readonly="!canEdit"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.settings.company.addressAr')"
          :error="fieldErrors.addressAr"
        >
          <AppInput
            :id="id"
            v-model="form.addressAr"
            :readonly="!canEdit"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>
      </div>

      <div v-if="canEdit">
        <AppButton
          type="submit"
          :loading="pending"
        >
          {{ t('common.actions.saveChanges') }}
        </AppButton>
      </div>
    </form>
  </div>
</template>
