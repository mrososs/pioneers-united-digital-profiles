<script setup lang="ts">
import type { PublicProfile } from '#shared/types/profile'
import { useProfileLinks } from '~/composables/useProfileLinks'

/**
 * The action row: save contact, call, e-mail, WhatsApp, copy link.
 *
 * "Save contact" is the primary action — downloading the vCard is the whole point of a
 * digital business card — and it is a real `<a download>` to the server endpoint rather
 * than a JavaScript blob, so it works in the in-app browsers of WhatsApp and LinkedIn
 * where programmatic downloads are frequently blocked.
 *
 * Actions with no underlying data are omitted rather than disabled: a greyed-out "Call"
 * on a profile with no phone number is noise.
 */
const props = defineProps<{
  profile: PublicProfile
}>()

const { t } = useI18n()
const { vcardUrl, telHref, mailtoHref, whatsappHref, shareUrl } = useProfileLinks(() => props.profile)
const { copy, copied } = useClipboard()

async function copyShareUrl() {
  if (shareUrl.value) await copy(shareUrl.value)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <AppButton
      v-if="vcardUrl"
      :href="vcardUrl"
      download
      variant="primary"
      size="lg"
      block
    >
      {{ t('profile.actions.saveContact') }}
    </AppButton>

    <p class="text-center text-xs text-muted-fg">
      {{ t('profile.actions.saveContactHint') }}
    </p>

    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <AppButton
        v-if="telHref"
        :href="telHref"
        variant="secondary"
        size="sm"
      >
        {{ t('profile.actions.call') }}
      </AppButton>

      <AppButton
        v-if="mailtoHref"
        :href="mailtoHref"
        variant="secondary"
        size="sm"
      >
        {{ t('profile.actions.email') }}
      </AppButton>

      <AppButton
        v-if="whatsappHref"
        :href="whatsappHref"
        variant="secondary"
        size="sm"
      >
        {{ t('profile.actions.whatsapp') }}
      </AppButton>

      <AppButton
        v-if="profile.linkedinUrl"
        :href="profile.linkedinUrl"
        variant="secondary"
        size="sm"
      >
        {{ t('profile.actions.linkedin') }}
      </AppButton>
    </div>

    <AppButton
      variant="ghost"
      size="sm"
      @click="copyShareUrl"
    >
      {{ copied ? t('common.actions.copied') : t('common.actions.copyLink') }}
    </AppButton>
  </div>
</template>
