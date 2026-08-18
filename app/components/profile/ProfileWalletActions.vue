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
 *
 * DESIGN SYSTEM
 *   These are the one place the product's own button styling is set aside. Apple
 *   and Google both publish add-to-wallet badge conventions, and a visitor
 *   recognises the black pill faster than any branded alternative — so this is a
 *   48px black pill with the platform's own solid mark, per the system's
 *   `WalletButton`. The mark is never recoloured into brand navy.
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

const WALLET_CLASS = 'inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-md border '
  + 'text-sm font-medium transition-colors duration-[160ms] ease-standard '
  + 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
</script>

<template>
  <section class="flex flex-col gap-3">
    <h2 class="pu-eyebrow text-muted-fg">
      {{ t('profile.wallet.title') }}
    </h2>

    <div
      v-if="anyReady"
      class="flex flex-col gap-2.5"
    >
      <a
        v-if="appleReady && appleWalletUrl"
        :href="appleWalletUrl"
        :class="[WALLET_CLASS, 'border-wallet-dark bg-wallet-dark text-wallet-light hover:border-wallet-dark-hover hover:bg-wallet-dark-hover']"
      >
        <AppIcon
          name="apple"
          :size="18"
        />
        {{ t('profile.actions.addToAppleWallet') }}
      </a>

      <a
        v-if="googleReady && googleWalletUrl"
        :href="googleWalletUrl"
        :class="[WALLET_CLASS, 'border-wallet-light-border bg-wallet-light text-wallet-light-fg hover:border-wallet-light-border-hover hover:bg-wallet-light-hover']"
      >
        <AppIcon
          name="google"
          :size="18"
        />
        {{ t('profile.actions.addToGoogleWallet') }}
      </a>
    </div>

    <AppAlert
      v-else
      tone="info"
    >
      {{ t('profile.wallet.unavailable') }}
    </AppAlert>
  </section>
</template>
