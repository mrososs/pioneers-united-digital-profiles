<script setup lang="ts">
import type { PublicProfile } from '#shared/types/profile'
import { useProfileLinks } from '~/composables/useProfileLinks'

/**
 * QR code panel with PNG/SVG downloads.
 *
 * The code is an `<img>` pointing at the server endpoint, not an inline data URI: the
 * endpoint is cacheable, keeps the QR out of the HTML payload, and guarantees that what
 * is displayed is byte-identical to what a colleague downloads for print.
 *
 * The code always encodes the canonical profile URL — the server refuses to encode
 * anything else — so a printed card keeps working after a phone number changes.
 */
const props = defineProps<{
  profile: PublicProfile
}>()

const { t } = useI18n()
const { qrSvgUrl, qrPngDownloadUrl, qrSvgDownloadUrl } = useProfileLinks(() => props.profile)
</script>

<template>
  <AppCard>
    <div class="flex flex-col items-center gap-4">
      <h2 class="text-sm font-medium text-muted-fg">
        {{ t('profile.qr.title') }}
      </h2>

      <img
        v-if="qrSvgUrl"
        :src="qrSvgUrl"
        :alt="t('profile.qr.alt', { name: profile.name })"
        width="192"
        height="192"
        class="size-48 rounded-md bg-white p-2"
        loading="lazy"
        decoding="async"
      >

      <p class="text-xs text-muted-fg">
        {{ t('profile.qr.hint') }}
      </p>

      <div class="flex flex-wrap justify-center gap-2">
        <AppButton
          v-if="qrPngDownloadUrl"
          :href="qrPngDownloadUrl"
          variant="secondary"
          size="sm"
          download
        >
          {{ t('profile.actions.downloadQrPng') }}
        </AppButton>

        <AppButton
          v-if="qrSvgDownloadUrl"
          :href="qrSvgDownloadUrl"
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
