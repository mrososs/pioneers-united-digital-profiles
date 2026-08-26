<script setup lang="ts">
import type { PublicProfile } from '#shared/types/profile'

/**
 * Name, portrait, role and organisation — the identity block at the top of a
 * public profile.
 *
 * Presentational only: it receives an already locale-resolved `PublicProfile` and picks
 * nothing, fetches nothing and decides nothing. That is what lets the same component
 * serve an individual and a company profile.
 *
 * DESIGN SYSTEM
 *   The block reads organisation micro-cap → copper rule → name → title, in
 *   that order. The rule is the only decorative use of the accent in the whole
 *   system and it is what makes the identity read as Pioneers United rather than
 *   as a generic contact card, so it is not optional styling.
 *
 *   The portrait is square with 2px corners. Until real photography exists,
 *   `AppAvatar` renders a monogram plate — see the design system's note that no
 *   licensed imagery ships with it.
 *
 * MOTION
 *   The hero is above the fold, so it plays on mount rather than on scroll. The
 *   copper rule draws out from zero width: it is the one gesture in the profile
 *   that is genuinely brand-specific, and animating width rather than opacity is
 *   what makes it read as being drawn.
 */
const props = withDefaults(defineProps<{
  profile: PublicProfile
  /** `h1` on a profile page, `h2` when embedded in a wider page. */
  headingLevel?: 'h1' | 'h2'
  /** Styling for a navy surface. */
  inverse?: boolean
  /** Plays the entrance timeline on mount. Only the real hero should. */
  animate?: boolean
}>(), {
  headingLevel: 'h1',
  inverse: false,
  animate: false,
})

const { t } = useI18n()

const rootRef = useTemplateRef<HTMLElement>('root')
const { animate: runTimeline, PU_DURATION } = useMotion(rootRef)

const roleLine = computed(() => {
  const parts = [props.profile.jobTitle, props.profile.department].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
})

onMounted(() => {
  if (!props.animate) return

  runTimeline((timeline) => {
    timeline
      .from('[data-identity-portrait]', { opacity: 0, y: 10, duration: PU_DURATION.slow })
      .from('[data-identity-org]', { opacity: 0, y: 6 }, '-=0.16')
      // `width` rather than `scaleX`: the rule has a fixed 32px length in the
      // design system and scaling would blur its 2px edge.
      .from('[data-identity-rule]', { width: 0, duration: PU_DURATION.slow }, '-=0.1')
      .from('[data-identity-name]', { opacity: 0, y: 8 }, '-=0.24')
      .from('[data-identity-meta]', { opacity: 0, y: 6, stagger: 0.06 }, '-=0.16')
  })
})
</script>

<template>
  <header
    ref="root"
    class="flex flex-col items-center gap-4 text-center"
  >
    <AppAvatar
      data-identity-portrait
      :src="profile.photoUrl"
      :name="profile.name"
      :alt="t('profile.photoAlt', { name: profile.name })"
      size="2xl"
      :inverse="inverse"
    />

    <div class="flex flex-col items-center gap-2.5">
      <p
        data-identity-org
        class="pu-eyebrow"
        :class="inverse ? 'text-accent' : 'text-muted-fg'"
      >
        {{ profile.organization.name }}
      </p>

      <span
        data-identity-rule
        class="pu-rule"
        aria-hidden="true"
      />

      <component
        :is="headingLevel"
        data-identity-name
        class="text-2xl font-semibold text-balance"
        :class="inverse ? 'text-surface-inverse-fg' : 'text-heading'"
      >
        {{ profile.name }}
      </component>

      <p
        v-if="roleLine"
        data-identity-meta
        class="text-sm text-balance"
        :class="inverse ? 'text-on-navy-78' : 'text-body'"
      >
        {{ roleLine }}
      </p>

      <p
        v-if="profile.location"
        data-identity-meta
        class="flex items-center gap-1.5 text-xs"
        :class="inverse ? 'text-on-navy-62' : 'text-muted-fg'"
      >
        <AppIcon
          name="map-pin"
          :size="14"
        />
        {{ profile.location }}
      </p>

      <!-- The positioning line. Constrained to ~46 characters per line so it
           stays two or three lines on a phone: it sits above the contact tiles,
           and a paragraph here would push the one action the page exists for
           below the fold. -->
      <p
        v-if="profile.headline"
        data-identity-meta
        class="mt-1 max-w-[34ch] text-sm leading-relaxed text-balance"
        :class="inverse ? 'text-on-navy-78' : 'text-body'"
      >
        {{ profile.headline }}
      </p>
    </div>
  </header>
</template>
