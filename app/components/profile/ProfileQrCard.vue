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
 *
 * DESIGN SYSTEM
 *   The copper corner ticks (`.pu-qr-frame`) are what make this a Pioneers United
 *   QR rather than a generic one. They are drawn as pseudo-elements with logical
 *   insets so the pair mirrors under RTL, and they sit on a white plate because
 *   a QR needs maximum quiet-zone contrast to scan reliably from print.
 *
 *   The caption is the canonical URL in IBM Plex Mono, `dir="ltr"` so an Arabic
 *   page does not reorder `https://`.
 */
const props = defineProps<{
  profile: PublicProfile
}>()

const { t } = useI18n()
const { qrSvgUrl, qrPngDownloadUrl, qrSvgDownloadUrl, shareUrl } = useProfileLinks(() => props.profile)
</script>

<template>
  <AppCard padding="none">
    <div class="flex flex-col items-center gap-3.5 p-5">
      <h2 class="pu-eyebrow text-muted-fg">
        {{ t('profile.qr.title') }}
      </h2>

      <div
        v-if="qrSvgUrl"
        class="pu-qr-frame p-3.5"
      >
        <img
          :src="qrSvgUrl"
          :alt="t('profile.qr.alt', { name: profile.name })"
          width="176"
          height="176"
          class="size-44"
          loading="lazy"
          decoding="async"
        >
      </div>

      <p
        v-if="shareUrl"
        class="pu-mono max-w-full text-center text-2xs break-words text-muted-fg"
        dir="ltr"
      >
        {{ shareUrl }}
      </p>

      <p class="text-center text-2xs text-faint">
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
          <AppIcon
            name="download"
            :size="15"
          />
          {{ t('profile.actions.downloadQrPng') }}
        </AppButton>

        <AppButton
          v-if="qrSvgDownloadUrl"
          :href="qrSvgDownloadUrl"
          variant="secondary"
          size="sm"
          download
        >
          <AppIcon
            name="download"
            :size="15"
          />
          {{ t('profile.actions.downloadQrSvg') }}
        </AppButton>
      </div>
    </div>
  </AppCard>
</template>
