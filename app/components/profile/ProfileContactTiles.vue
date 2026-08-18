<script setup lang="ts">
import type { PublicProfile } from '#shared/types/profile'
import type { IconName } from '~/utils/icons'
import { useProfileLinks } from '~/composables/useProfileLinks'

/**
 * The row of contact tiles: call, e-mail, WhatsApp, LinkedIn, share.
 *
 * Tiles with no underlying data are omitted rather than disabled — a greyed-out
 * "Call" on a profile with no phone number is noise, and on a five-across row it
 * also wastes a fifth of the width the remaining tiles could use.
 *
 * DESIGN SYSTEM
 *   A 64px-minimum stacked tile: glyph over a 11px label, hairline border, 4px
 *   radius. On the navy hero the tiles switch to the fixed transparency steps
 *   (0.06 fill, 0.16 border) rather than to a lighter navy, because the system
 *   allows transparency on navy only at those steps.
 *
 * ACCESSIBILITY
 *   Each tile is a real `<a>` or `<button>` and carries a visible text label, so
 *   the glyph is decoration and stays `aria-hidden`. The 64px minimum height
 *   clears the design system's 44px touch target on profile screens with room to
 *   spare — these are the controls a visitor reaches for one-handed after
 *   scanning a QR code.
 */
const props = withDefaults(defineProps<{
  profile: PublicProfile
  /** Styling for a navy surface. */
  inverse?: boolean
}>(), {
  inverse: false,
})

const { t } = useI18n()
const { telHref, mailtoHref, whatsappHref, shareUrl } = useProfileLinks(() => props.profile)
const { copy, copied } = useClipboard()

interface Tile {
  key: string
  icon: IconName
  label: string
  href?: string
  external?: boolean
  action?: () => void
}

const tiles = computed<Tile[]>(() => {
  const items: Tile[] = []

  if (telHref.value) {
    items.push({ key: 'call', icon: 'phone', label: t('profile.actions.call'), href: telHref.value })
  }

  if (mailtoHref.value) {
    items.push({ key: 'email', icon: 'mail', label: t('profile.actions.email'), href: mailtoHref.value })
  }

  if (whatsappHref.value) {
    items.push({
      key: 'whatsapp',
      icon: 'whatsapp',
      label: t('profile.actions.whatsapp'),
      href: whatsappHref.value,
      external: true,
    })
  }

  if (props.profile.linkedinUrl) {
    items.push({
      key: 'linkedin',
      icon: 'linkedin',
      label: t('profile.actions.linkedin'),
      href: props.profile.linkedinUrl,
      external: true,
    })
  }

  if (shareUrl.value) {
    items.push({
      key: 'share',
      icon: copied.value ? 'check' : 'share-2',
      label: copied.value ? t('common.actions.copied') : t('profile.actions.share'),
      action: () => void copy(shareUrl.value as string),
    })
  }

  return items
})

const tileClass = computed(() => [
  'flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-sm border px-1 py-2.5',
  'transition-[background-color,border-color,color] duration-[160ms] ease-standard',
  'focus-visible:outline-2 focus-visible:outline-offset-2',
  props.inverse
    ? 'border-border-inverse bg-on-navy-06 text-surface-inverse-fg hover:border-white/30 hover:bg-on-navy-16 focus-visible:outline-ring-inverse'
    : 'border-border bg-surface text-heading hover:border-border-strong hover:bg-surface-hover focus-visible:outline-ring',
])

const labelClass = computed(() => [
  'text-3xs font-medium ltr:tracking-[0.04em] rtl:text-2xs',
  props.inverse ? 'text-on-navy-62' : 'text-muted-fg',
])
</script>

<template>
  <div
    v-if="tiles.length > 0"
    class="grid grid-flow-col auto-cols-fr gap-2"
  >
    <component
      :is="tile.href ? 'a' : 'button'"
      v-for="tile in tiles"
      :key="tile.key"
      :href="tile.href"
      :type="tile.href ? undefined : 'button'"
      :target="tile.external ? '_blank' : undefined"
      :rel="tile.external ? 'noopener noreferrer' : undefined"
      :class="tileClass"
      @click="tile.action?.()"
    >
      <AppIcon
        :name="tile.icon"
        :size="19"
      />
      <span :class="labelClass">{{ tile.label }}</span>
    </component>
  </div>
</template>
