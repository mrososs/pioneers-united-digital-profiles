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
 */
const props = defineProps<{
  profile: PublicProfile
}>()

const { t } = useI18n()
const { vcardUrl } = useProfileLinks(() => props.profile)
</script>

<template>
  <div
    v-if="vcardUrl"
    class="flex flex-col gap-2.5"
  >
    <AppButton
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

    <p class="text-center text-2xs text-muted-fg">
      {{ t('profile.actions.saveContactHint') }}
    </p>
  </div>
</template>
