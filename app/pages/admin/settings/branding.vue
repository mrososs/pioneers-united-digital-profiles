<script setup lang="ts">
import type { Branding } from '#shared/types/organization'

/**
 * Branding settings.
 *
 * Only validated hex colours are storable — never raw CSS — because these values feed the
 * semantic custom properties in app/assets/css/main.css. Accepting arbitrary strings here
 * would be a style-injection hole on every public profile.
 *
 * Asset uploads (logo, favicon, social image) have a working server endpoint
 * (/api/admin/media/upload) but no picker yet; the current paths are shown so an operator
 * can see what is set.
 */
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

const { t } = useI18n()
const { can } = useAdminSession()

const { data: branding, refresh } = await useFetch<Branding>('/api/admin/branding')

const canEdit = computed(() => can('branding:write'))
const saved = shallowRef(false)

const form = reactive({
  primaryColor: '',
  primaryForegroundColor: '',
  accentColor: '',
  footerNoteEn: '',
  footerNoteAr: '',
})

watch(branding, (value) => {
  if (!value) return
  form.primaryColor = value.primaryColor ?? ''
  form.primaryForegroundColor = value.primaryForegroundColor ?? ''
  form.accentColor = value.accentColor ?? ''
  form.footerNoteEn = value.footerNoteEn ?? ''
  form.footerNoteAr = value.footerNoteAr ?? ''
}, { immediate: true })

const { execute: save, pending, errorMessage, fieldErrors } = useAsyncAction(async () => {
  await $fetch('/api/admin/branding', { method: 'PATCH', body: { ...form } })
  await refresh()
  saved.value = true
})

const { scrollToTop } = useScrollToTop()

/** Scroll up after the request settles so the success or error alert above the form is visible. */
async function onSubmit() {
  await save()
  scrollToTop()
}

const assetRows = computed(() => [
  { label: t('admin.settings.branding.logo'), value: branding.value?.logoPath },
  { label: t('admin.settings.branding.logoDark'), value: branding.value?.logoDarkPath },
  { label: t('admin.settings.branding.favicon'), value: branding.value?.faviconPath },
  { label: t('admin.settings.branding.ogImage'), value: branding.value?.ogImagePath },
])

useSeoMeta({
  title: () => t('admin.settings.branding.title'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      :title="t('admin.settings.branding.title')"
      :description="t('admin.settings.branding.description')"
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
      {{ t('admin.settings.branding.saved') }}
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
      <div class="grid gap-4 sm:grid-cols-3">
        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.settings.branding.primaryColor')"
          :error="fieldErrors.primaryColor"
          hint="#192341"
        >
          <AppInput
            :id="id"
            v-model="form.primaryColor"
            dir="ltr"
            :readonly="!canEdit"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.settings.branding.primaryForegroundColor')"
          :error="fieldErrors.primaryForegroundColor"
          hint="#fcfdfd"
        >
          <AppInput
            :id="id"
            v-model="form.primaryForegroundColor"
            dir="ltr"
            :readonly="!canEdit"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.settings.branding.accentColor')"
          :error="fieldErrors.accentColor"
          hint="#e18146"
        >
          <AppInput
            :id="id"
            v-model="form.accentColor"
            dir="ltr"
            :readonly="!canEdit"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.settings.branding.footerNoteEn')"
          :error="fieldErrors.footerNoteEn"
        >
          <AppInput
            :id="id"
            v-model="form.footerNoteEn"
            :readonly="!canEdit"
            :invalid="invalid"
            :described-by="describedBy"
          />
        </AppFormField>

        <AppFormField
          v-slot="{ id, describedBy, invalid }"
          :label="t('admin.settings.branding.footerNoteAr')"
          :error="fieldErrors.footerNoteAr"
        >
          <AppInput
            :id="id"
            v-model="form.footerNoteAr"
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

    <AppCard>
      <h2 class="text-sm font-semibold text-foreground">
        {{ t('admin.profileForm.sections.media') }}
      </h2>

      <dl class="mt-3 grid gap-3 sm:grid-cols-2">
        <div
          v-for="asset in assetRows"
          :key="asset.label"
        >
          <dt class="text-xs text-muted-fg">
            {{ asset.label }}
          </dt>
          <dd
            class="mt-0.5 font-mono text-xs break-all text-foreground"
            dir="ltr"
          >
            {{ asset.value || t('common.notAvailable') }}
          </dd>
        </div>
      </dl>
    </AppCard>
  </div>
</template>
