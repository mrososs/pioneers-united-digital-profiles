<script setup lang="ts">
import type { PublicProfile } from '#shared/types/profile'
import { useProfileLinks } from '~/composables/useProfileLinks'

/**
 * The "Share" tile inside ProfileContactTiles, upgraded from a plain
 * copy-the-link action into a menu: share (or copy) the link, or get the
 * profile as a PDF.
 *
 * Kept as its own component because it needs AppDropdown's menu behaviour
 * (outside-click, Escape, focus return) where every other tile in
 * ProfileContactTiles is a plain `<a>`/`<button>` — folding a floating menu
 * into that component's generic tile loop would make the loop stop being
 * generic. `AppDropdown`'s `bare` prop lets this tile keep the exact look of
 * its siblings instead of the dropdown's own pill styling.
 */
const props = withDefaults(defineProps<{
  profile: PublicProfile
  /** Styling for a navy surface — this tile only ever appears inside the hero. */
  inverse?: boolean
}>(), {
  inverse: false,
})

const { t } = useI18n()
const { shareUrl, pdfUrl } = useProfileLinks(() => props.profile)
const { copy, copied } = useClipboard()

/**
 * The native share sheet when it exists — mobile, and a growing set of desktop
 * browsers — puts WhatsApp/LinkedIn/Messages one tap away. Otherwise falls
 * back to copying the link, same as the tile's previous behaviour.
 */
async function shareLink(close: () => void) {
  const url = shareUrl.value
  if (!url) return

  if (navigator.share) {
    try {
      await navigator.share({ title: props.profile.name, url })
      close()
      return
    }
    catch {
      // The visitor dismissed the OS share sheet, or the browser refused it
      // silently. Either way, falling through to copy is a reasonable recovery.
    }
  }

  await copy(url)
}

const tileClass = computed(() => [
  'flex h-full min-h-16 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-sm border px-1 py-2.5',
  'transition-[background-color,border-color,color] duration-[160ms] ease-standard',
  props.inverse
    ? 'border-border-inverse bg-on-navy-06 text-surface-inverse-fg hover:border-white/30 hover:bg-on-navy-16'
    : 'border-border bg-surface text-heading hover:border-border-strong hover:bg-surface-hover',
])

const labelClass = computed(() => [
  'text-3xs font-medium ltr:tracking-[0.04em] rtl:text-2xs',
  props.inverse ? 'text-on-navy-62' : 'text-muted-fg',
])

const menuItemClass = 'flex w-full items-center gap-2.5 rounded-xs px-3 py-2.5 text-start text-sm text-heading'
  + ' transition-colors duration-[160ms] ease-standard hover:bg-surface-hover'
</script>

<template>
  <AppDropdown
    v-if="shareUrl"
    :label="t('profile.actions.share')"
    align="end"
    bare
    :inverse="inverse"
  >
    <template #trigger>
      <span :class="tileClass">
        <AppIcon
          :name="copied ? 'check' : 'share-2'"
          :size="19"
        />
        <span :class="labelClass">{{ copied ? t('common.actions.copied') : t('profile.actions.share') }}</span>
      </span>
    </template>

    <template #default="{ close }">
      <button
        type="button"
        role="menuitem"
        :class="menuItemClass"
        @click="shareLink(close)"
      >
        <AppIcon
          name="link"
          :size="16"
          class="text-muted-fg"
        />
        {{ t('profile.actions.shareLink') }}
      </button>

      <a
        v-if="pdfUrl"
        :href="pdfUrl"
        download
        role="menuitem"
        :class="menuItemClass"
        @click="close()"
      >
        <AppIcon
          name="file-text"
          :size="16"
          class="text-muted-fg"
        />
        {{ t('profile.actions.sharePdf') }}
      </a>
    </template>
  </AppDropdown>
</template>
