<script setup lang="ts">
import type { IconName } from '~/utils/icons'

/**
 * Dashboard navigation.
 *
 * Paths go through `localePath()`, so the dashboard is fully bilingual and a link never
 * drops the visitor out of their language.
 *
 * `aria-current="page"` marks the active item — colour alone would leave a screen-reader
 * user with no idea where they are. Active state is computed from the UNPREFIXED path so
 * the check works identically under /en and /ar.
 *
 * DESIGN SYSTEM
 *   The rail is navy-900 and its items use the fixed transparency steps on navy:
 *   0.06 on hover, 0.10 for the current page. Nothing on the rail takes a solid
 *   fill — a filled navy item on a navy plate reads as a hole rather than a
 *   selection.
 *
 *   The focus ring switches to the inverse token here, because the standard
 *   navy ring is invisible against the rail.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { can } = useAdminSession()

interface NavItem {
  to: string
  label: string
  icon: IconName
  /** When set, the item renders only if the session carries this capability. */
  requires?: 'branding:write' | 'integrations:write'
}

const items = computed<NavItem[]>(() => [
  { to: '/admin', label: t('admin.nav.dashboard'), icon: 'layout-dashboard' },
  { to: '/admin/profiles', label: t('admin.nav.profiles'), icon: 'id-card' },
  { to: '/admin/qr', label: t('admin.nav.qr'), icon: 'qr-code' },
  { to: '/admin/wallet', label: t('admin.nav.wallet'), icon: 'wallet' },
  { to: '/admin/settings', label: t('admin.nav.settings'), icon: 'settings' },
])

const visibleItems = computed(() =>
  items.value.filter(item => !item.requires || can(item.requires)),
)

/** Strips the locale prefix so `/ar/admin/profiles` compares as `/admin/profiles`. */
const currentPath = computed(() => route.path.replace(/^\/(en|ar)(?=\/|$)/, '') || '/')

function isActive(to: string): boolean {
  if (to === '/admin') return currentPath.value === '/admin'
  return currentPath.value.startsWith(to)
}
</script>

<template>
  <nav
    :aria-label="t('admin.title')"
    class="flex flex-col gap-0.5"
  >
    <NuxtLink
      v-for="item in visibleItems"
      :key="item.to"
      :to="localePath(item.to)"
      :aria-current="isActive(item.to) ? 'page' : undefined"
      class="flex h-10 items-center gap-3 rounded-sm px-3 text-sm
             transition-colors duration-[160ms] ease-standard
             focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring-inverse"
      :class="isActive(item.to)
        ? 'bg-on-navy-10 font-semibold text-surface-inverse-fg'
        : 'font-medium text-on-navy-62 hover:bg-on-navy-06 hover:text-surface-inverse-fg'"
    >
      <AppIcon
        :name="item.icon"
        :size="18"
      />
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>
