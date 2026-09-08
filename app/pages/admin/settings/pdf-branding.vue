<script setup lang="ts">
import type { PdfBranding } from '#shared/types/organization'

/**
 * PDF branding settings.
 *
 * Only validated hex colours are storable — never raw CSS — because these values are
 * interpolated into CSS custom properties on the profile's print view
 * (app/components/profile/ProfilePrintView.vue), which is what
 * server/services/pdf/pdf.service.ts screenshots into a PDF. Two independent trios,
 * because the exported individual and company documents are handed out separately and
 * may legitimately look different.
 */
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

const { t } = useI18n()
const { can } = useAdminSession()

const { data: pdfBranding, refresh } = await useFetch<PdfBranding>('/api/admin/branding/pdf')

const canEdit = computed(() => can('branding:write'))
const saved = shallowRef(false)

const form = reactive({
  individualBackgroundColor: '',
  individualTextColor: '',
  individualLineColor: '',
  companyBackgroundColor: '',
  companyTextColor: '',
  companyLineColor: '',
})

watch(pdfBranding, (value) => {
  if (!value) return
  form.individualBackgroundColor = value.individualBackgroundColor ?? ''
  form.individualTextColor = value.individualTextColor ?? ''
  form.individualLineColor = value.individualLineColor ?? ''
  form.companyBackgroundColor = value.companyBackgroundColor ?? ''
  form.companyTextColor = value.companyTextColor ?? ''
  form.companyLineColor = value.companyLineColor ?? ''
}, { immediate: true })

const { execute: save, pending, errorMessage, fieldErrors } = useAsyncAction(async () => {
  await $fetch('/api/admin/branding/pdf', { method: 'PATCH', body: { ...form } })
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
  title: () => t('admin.settings.pdfBranding.title'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      :title="t('admin.settings.pdfBranding.title')"
      :description="t('admin.settings.pdfBranding.description')"
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
      {{ t('admin.settings.pdfBranding.saved') }}
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
      <AppCard>
        <h2 class="text-sm font-semibold text-foreground">
          {{ t('admin.settings.pdfBranding.individualGroup') }}
        </h2>

        <div class="mt-4 grid gap-4 sm:grid-cols-3">
          <AppFormField
            v-slot="{ id, describedBy, invalid }"
            :label="t('admin.settings.pdfBranding.backgroundColor')"
            :error="fieldErrors.individualBackgroundColor"
            hint="#fcfdfd"
          >
            <AppInput
              :id="id"
              v-model="form.individualBackgroundColor"
              dir="ltr"
              :readonly="!canEdit"
              :invalid="invalid"
              :described-by="describedBy"
            />
          </AppFormField>

          <AppFormField
            v-slot="{ id, describedBy, invalid }"
            :label="t('admin.settings.pdfBranding.textColor')"
            :error="fieldErrors.individualTextColor"
            hint="#192341"
          >
            <AppInput
              :id="id"
              v-model="form.individualTextColor"
              dir="ltr"
              :readonly="!canEdit"
              :invalid="invalid"
              :described-by="describedBy"
            />
          </AppFormField>

          <AppFormField
            v-slot="{ id, describedBy, invalid }"
            :label="t('admin.settings.pdfBranding.lineColor')"
            :error="fieldErrors.individualLineColor"
            hint="#a8894f"
          >
            <AppInput
              :id="id"
              v-model="form.individualLineColor"
              dir="ltr"
              :readonly="!canEdit"
              :invalid="invalid"
              :described-by="describedBy"
            />
          </AppFormField>
        </div>
      </AppCard>

      <AppCard>
        <h2 class="text-sm font-semibold text-foreground">
          {{ t('admin.settings.pdfBranding.companyGroup') }}
        </h2>

        <div class="mt-4 grid gap-4 sm:grid-cols-3">
          <AppFormField
            v-slot="{ id, describedBy, invalid }"
            :label="t('admin.settings.pdfBranding.backgroundColor')"
            :error="fieldErrors.companyBackgroundColor"
            hint="#fcfdfd"
          >
            <AppInput
              :id="id"
              v-model="form.companyBackgroundColor"
              dir="ltr"
              :readonly="!canEdit"
              :invalid="invalid"
              :described-by="describedBy"
            />
          </AppFormField>

          <AppFormField
            v-slot="{ id, describedBy, invalid }"
            :label="t('admin.settings.pdfBranding.textColor')"
            :error="fieldErrors.companyTextColor"
            hint="#192341"
          >
            <AppInput
              :id="id"
              v-model="form.companyTextColor"
              dir="ltr"
              :readonly="!canEdit"
              :invalid="invalid"
              :described-by="describedBy"
            />
          </AppFormField>

          <AppFormField
            v-slot="{ id, describedBy, invalid }"
            :label="t('admin.settings.pdfBranding.lineColor')"
            :error="fieldErrors.companyLineColor"
            hint="#a8894f"
          >
            <AppInput
              :id="id"
              v-model="form.companyLineColor"
              dir="ltr"
              :readonly="!canEdit"
              :invalid="invalid"
              :described-by="describedBy"
            />
          </AppFormField>
        </div>
      </AppCard>

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
