<script setup lang="ts">
import type { PublicProfile } from '#shared/types/profile'
import type { WalletAvailability } from '#shared/types/wallet'
import { useProfileLinks } from '~/composables/useProfileLinks'

/**
 * "Add to Apple/Google Wallet" buttons.
 *
 * Each button renders only when the server reports that provider as configured. Showing a
 * button that answers 503 would be worse than showing nothing, and the decision cannot be
 * made on the client — only the server knows whether the credentials exist. When neither
 * provider is ready the whole section is replaced by an explanatory empty state rather
 * than silently disappearing.
 *
 * The endpoints are plain links: Apple returns a .pkpass to hand to the OS, Google
 * redirects to a signed save URL. Neither ever exposes credentials to the browser.
 */
const props = defineProps<{
  profile: PublicProfile
  availability: WalletAvailability | null
}>()

const { t } = useI18n()
const { appleWalletUrl, googleWalletUrl } = useProfileLinks(() => props.profile)

const appleReady = computed(() => props.availability?.apple === true)
const googleReady = computed(() => props.availability?.google === true)
const anyReady = computed(() => appleReady.value || googleReady.value)
</script>

<template>
  <section class="flex flex-col gap-3">
    <h2 class="text-sm font-medium text-muted-fg">
      {{ t('profile.wallet.title') }}
    </h2>

    <div
      v-if="anyReady"
      class="flex flex-col gap-2 sm:flex-row"
    >
      <AppButton
        v-if="appleReady && appleWalletUrl"
        :href="appleWalletUrl"
        variant="secondary"
        block
      >
        {{ t('profile.actions.addToAppleWallet') }}
      </AppButton>

      <AppButton
        v-if="googleReady && googleWalletUrl"
        :href="googleWalletUrl"
        variant="secondary"
        block
      >
        {{ t('profile.actions.addToGoogleWallet') }}
      </AppButton>
    </div>

    <AppAlert
      v-else
      tone="info"
    >
      {{ t('profile.wallet.unavailable') }}
    </AppAlert>
  </section>
</template>
