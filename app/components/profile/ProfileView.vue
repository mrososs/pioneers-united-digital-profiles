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
 *
 * LAYOUT
 *   Mobile-first, in the design system's 430px column: hero, save contact,
 *   wallet, QR, about, links, company. From `lg` the same blocks reflow into the
 *   system's desktop adaptation — 1080px of content with the QR and wallet
 *   lifted into a sticky 340px panel beside the reading column, because on a
 *   desktop the QR is the thing a visitor points a phone at while the page stays
 *   open.
 *
 *   ONE INSTANCE OF EVERY BLOCK
 *   The reflow is done with explicit grid placement, not by rendering a mobile
 *   copy and a desktop copy and hiding one with `lg:hidden`. Two copies would be
 *   two copies in the DOM at every viewport: a screen reader announces the QR
 *   panel twice, the QR endpoint is fetched twice, and any id inside the block
 *   is duplicated. Placement moves the same nodes instead.
 *
 *   DOM order is actions → panel → content, which is the correct reading order
 *   on a phone. At `lg` the panel is pinned to column two spanning both rows, so
 *   the reading column reads actions → content with the panel alongside.
 *
 * MOTION
 *   `v-reveal` on each block below the fold. The hero animates on mount instead,
 *   since it is already in view. Nothing is pinned or parallaxed: the design
 *   system's motion rule allows the entrance and nothing beyond it.
 */
const props = defineProps<{
  profile: PublicProfile
  walletAvailability: WalletAvailability | null
}>()

const { t } = useI18n()

const isCompany = computed(() => props.profile.profileType === 'company')

/**
 * Structured content blocks, split into the summary strip and everything else.
 *
 * The metrics band is lifted out of the section flow and placed directly under
 * the contact action: it is a summary, not a destination, and burying it below
 * the bio would waste the one block a reader takes in at a glance. See
 * `useProfileSections` for why it is also excluded from the navigation.
 */
const { navItems, metrics, body, showNav } = useProfileSections(() => props.profile.sections)
</script>

<template>
  <article>
    <ProfileHero :profile="profile" />

    <div class="mx-auto w-full max-w-profile px-5 py-8 lg:max-w-profile-wide lg:px-10 lg:py-12">
      <!-- `grid-cols-1` gives the mobile track an explicit `minmax(0, 1fr)` width. Without
           it, the single implicit column falls back to `min-width: auto`, which sizes the
           track to its widest child's unwrapped content — a long company tagline or bio
           line then blows the whole page out past the viewport width instead of wrapping. -->
      <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-10">
        <div
          v-reveal
          class="lg:col-start-1 lg:row-start-1"
        >
          <ProfileContactActions :profile="profile" />
        </div>

        <!-- QR and wallet. Second in the DOM so a phone reads
             actions → wallet → QR → content, which is the design system's
             mobile order; pinned to column two from `lg`. -->
        <aside class="flex flex-col gap-8 lg:sticky lg:top-10 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <ProfileWalletActions
            v-reveal
            :profile="profile"
            :availability="walletAvailability"
            class="lg:order-2"
          />

          <div
            v-reveal
            class="lg:order-1"
          >
            <ProfileQrCard :profile="profile" />
          </div>
        </aside>

        <div class="flex flex-col gap-8 lg:col-start-1 lg:row-start-2">
          <!-- Summary strip. Above the bio because a reader takes in four
               figures faster than four sentences. -->
          <ProfileMetricsBand
            v-if="metrics && metrics.kind === 'metrics'"
            v-reveal
            :items="metrics.items"
          />

          <!-- Only worth the vertical space once there is enough page to get
               lost in — see `showNav`. -->
          <ProfileSectionNav
            v-if="showNav"
            :items="navItems"
          />

          <section
            v-if="profile.bio"
            id="section-about"
            v-reveal
            class="flex scroll-mt-20 flex-col gap-3 lg:scroll-mt-24"
          >
            <h2 class="pu-eyebrow text-muted-fg">
              {{ t('profile.sections.about') }}
            </h2>
            <p class="text-base leading-relaxed text-pretty text-body">
              {{ profile.bio }}
            </p>
          </section>

          <!-- Structured blocks. The component renders nothing for an empty
               array, so no emptiness guard is needed here. -->
          <ProfileSectionList :sections="body" />

          <!-- The emptiness check is here, not only inside the component: a
               runtime directive needs an element to attach to, and a component
               whose root is `v-if`-ed away renders a comment node. `v-reveal`
               on it directly would warn and silently do nothing. -->
          <ProfileLinkList
            v-if="profile.links.length > 0"
            v-reveal
            :links="profile.links"
          />

          <ProfileCompanyCard
            v-if="!isCompany"
            v-reveal
            :organization="profile.organization"
          />
        </div>
      </div>
    </div>
  </article>
</template>
