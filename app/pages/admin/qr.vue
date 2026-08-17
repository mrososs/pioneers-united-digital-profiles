<script setup lang="ts">
import type { PaginatedResult } from '#shared/types/api'
import type { ProfileListItem } from '#shared/types/profile'
import type { SelectOption } from '~/components/app/AppSelect.vue'

/**
 * QR codes for published profiles.
 *
 * Only published profiles are listed, because the QR endpoint refuses anything else — a
 * code that resolves to a 404 is worse than no code, especially once it is printed.
 *
 * The preview and the download links point at the same endpoint with the same parameters,
 * so what an administrator approves on screen is exactly what goes to the printer.
 */
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

const { t, locale } = useI18n()
const { pick } = useLocalizedField()

const { data, status } = await useFetch<PaginatedResult<ProfileListItem>>('/api/admin/profiles', {
  query: { status: 'published', perPage: 100 },
})

const selectedSlug = shallowRef<string | null>(null)

const options = computed<SelectOption[]>(() =>
  (data.value?.items ?? []).map(profile => ({
    value: profile.slug,
    label: `${pick(profile.nameEn, profile.nameAr) ?? profile.nameEn} (/${profile.slug})`,
  })),
)

// Preselect the first profile so the screen is never an empty frame with a dropdown.
watch(options, (next) => {
  if (!selectedSlug.value && next.length > 0) selectedSlug.value = next[0]?.value ?? null
}, { immediate: true })

const qrSrc = computed(() =>
  selectedSlug.value ? `/api/profiles/${selectedSlug.value}/qr?format=svg&locale=${locale.value}` : null,
)

const pngDownload = computed(() =>
  selectedSlug.value
    ? `/api/profiles/${selectedSlug.value}/qr?format=png&size=1024&locale=${locale.value}&download=1`
    : null,
)

const svgDownload = computed(() =>
  selectedSlug.value
    ? `/api/profiles/${selectedSlug.value}/qr?format=svg&locale=${locale.value}&download=1`
    : null,
)

useSeoMeta({
  title: () => t('admin.qr.title'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      :title="t('admin.qr.title')"
      :description="t('admin.qr.description')"
    />

    <AppEmptyState
      v-if="status !== 'pending' && options.length === 0"
      :title="t('admin.qr.empty')"
    />

    <template v-else>
      <div class="max-w-md">
        <AppFormField
          v-slot="{ id }"
          :label="t('admin.qr.selectProfile')"
        >
          <AppSelect
            :id="id"
            v-model="selectedSlug"
            :options="options"
          />
        </AppFormField>
      </div>

      <AppCard
        v-if="qrSrc"
        padding="lg"
      >
        <div class="flex flex-col items-center gap-5">
          <img
            :src="qrSrc"
            :alt="t('profile.qr.alt', { name: selectedSlug ?? '' })"
            width="256"
            height="256"
            class="size-64 rounded-md bg-white p-3"
          >

          <div class="flex flex-wrap justify-center gap-2">
            <AppButton
              v-if="pngDownload"
              :href="pngDownload"
              variant="secondary"
              size="sm"
              download
            >
              {{ t('profile.actions.downloadQrPng') }}
            </AppButton>

            <AppButton
              v-if="svgDownload"
              :href="svgDownload"
              variant="secondary"
              size="sm"
              download
            >
              {{ t('profile.actions.downloadQrSvg') }}
            </AppButton>
          </div>
        </div>
      </AppCard>
    </template>
  </div>
</template>
