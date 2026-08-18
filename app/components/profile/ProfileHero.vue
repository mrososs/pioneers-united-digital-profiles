<script setup lang="ts">
import type { PublicProfile } from '#shared/types/profile'

/**
 * The navy hero at the top of every public Digital Profile.
 *
 * WHY THE CHROME LIVES HERE AND NOT IN THE LAYOUT
 *   The brand mark and the language switch belong to the hero in the design
 *   system — they sit on the navy plate, above the portrait, not in a separate
 *   white bar. Splitting them into layout chrome would put a light strip above
 *   the navy and lose the single-surface reading the system is after. The public
 *   profile therefore uses its own `profile` layout, which contributes only the
 *   skip link and the mono URL footer.
 *
 * WHAT IT CONTAINS, IN ORDER
 *   brand mark · language · portrait · organisation micro-cap · copper rule ·
 *   name · title · location · five contact tiles.
 *
 *   Everything that matters is inside the first two screens of scroll, which is
 *   the constraint a QR-scanned page is designed against.
 *
 * The circle motif bleeding off the trailing top corner is `.pu-hero-motif` —
 * the system's one piece of architectural decoration, an outline at the 0.06
 * transparency step.
 */
defineProps<{
  profile: PublicProfile
}>()
</script>

<template>
  <section class="pu-hero-motif relative overflow-hidden bg-surface-inverse">
    <div class="mx-auto flex w-full max-w-profile flex-col gap-7 px-5 pt-5 pb-8 lg:max-w-profile-wide lg:px-10 lg:pt-7 lg:pb-11">
      <div class="flex items-center justify-between gap-4">
        <BrandLogo
          tone="white"
          size="sm"
        />
        <LocaleSwitcher tone="inverse" />
      </div>

      <ProfileIdentity
        :profile="profile"
        heading-level="h1"
        inverse
        animate
      />

      <div v-reveal.now="0.42">
        <ProfileContactTiles
          :profile="profile"
          inverse
        />
      </div>
    </div>
  </section>
</template>
