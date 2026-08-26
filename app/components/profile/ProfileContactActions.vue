<script setup lang="ts">
import type { PublicProfile } from '#shared/types/profile'
import { useProfileLinks } from '~/composables/useProfileLinks'

/**
 * "Save contact" — the single action the whole page exists to produce.
 *
 * It is a real `<a download>` pointing at the server endpoint rather than a
 * JavaScript blob, because programmatic downloads are frequently blocked in the
 * in-app browsers of WhatsApp and LinkedIn, which is exactly where this link
 * gets opened.
 *
 * The five secondary channels live in `ProfileContactTiles` inside the hero. This
 * component deliberately carries one control at full width and nothing that
 * competes with it.
 *
 * THE SECOND ACTION
 *   "Book a meeting" appears only when the profile carries a scheduling link. It
 *   is `secondary`, not a second primary: saving the contact is what the QR code
 *   was scanned for, and two equally weighted buttons would make the reader choose
 *   between them. It also opens in a new tab — the scheduling tool is somebody
 *   else's site, and losing the profile behind it is how a visitor loses the
 *   contact details they came for.
 */
const props = defineProps<{
  profile: PublicProfile
}>()

const { t } = useI18n()
const { vcardUrl } = useProfileLinks(() => props.profile)
</script>

<template>
  <div
    v-if="vcardUrl || profile.bookingUrl"
    class="flex flex-col gap-2.5"
  >
    <AppButton
      v-if="vcardUrl"
      :href="vcardUrl"
      download
      variant="primary"
      size="lg"
      block
    >
      <AppIcon
        name="id-card"
        :size="19"
      />
      {{ t('profile.actions.saveContact') }}
    </AppButton>

    <AppButton
      v-if="profile.bookingUrl"
      :href="profile.bookingUrl"
      target="_blank"
      rel="noopener noreferrer"
      variant="secondary"
      size="lg"
      block
    >
      <AppIcon
        name="clock"
        :size="19"
      />
      {{ t('profile.actions.bookMeeting') }}
    </AppButton>

    <p
      v-if="vcardUrl"
      class="text-center text-2xs text-muted-fg"
    >
      {{ t('profile.actions.saveContactHint') }}
    </p>
  </div>
</template>
