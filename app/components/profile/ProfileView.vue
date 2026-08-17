<script setup lang="ts">
import type { PublicProfile } from '#shared/types/profile'
import type { WalletAvailability } from '#shared/types/wallet'

/**
 * Composes a complete public Digital Profile.
 *
 * ONE COMPONENT FOR BOTH PROFILE TYPES
 *   An individual and the company differ only in which blocks appear: a company profile
 *   has no parent company card to show, and its bio is the corporate description. Giving
 *   them separate components would duplicate the contact actions, the QR panel, the
 *   wallet buttons and the layout — four places to keep in step for no gain. The single
 *   `profileType` branch below is the entire difference.
 *
 * The page above this component owns data fetching and SEO; this owns arrangement only.
 */
const props = defineProps<{
  profile: PublicProfile
  walletAvailability: WalletAvailability | null
}>()

const { t } = useI18n()

const isCompany = computed(() => props.profile.profileType === 'company')
</script>

<template>
  <article class="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:py-12">
    <ProfileIdentity
      :profile="profile"
      heading-level="h1"
    />

    <section
      v-if="profile.bio"
      class="flex flex-col gap-2"
    >
      <h2 class="text-sm font-medium text-muted-fg">
        {{ t('profile.sections.about') }}
      </h2>
      <p class="text-sm leading-relaxed text-pretty text-foreground">
        {{ profile.bio }}
      </p>
    </section>

    <ProfileContactActions :profile="profile" />

    <ProfileLinkList :links="profile.links" />

    <ProfileWalletActions
      :profile="profile"
      :availability="walletAvailability"
    />

    <ProfileQrCard :profile="profile" />

    <ProfileCompanyCard
      v-if="!isCompany"
      :organization="profile.organization"
    />
  </article>
</template>
