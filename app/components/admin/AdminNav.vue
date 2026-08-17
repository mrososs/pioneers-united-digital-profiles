<script setup lang="ts">
/**
 * Dashboard navigation.
 *
 * Paths go through `localePath()`, so the dashboard is fully bilingual and a link never
 * drops the visitor out of their language.
 *
 * `aria-current="page"` marks the active item — colour alone would leave a screen-reader
 * user with no idea where they are. Active state is computed from the UNPREFIXED path so
 * the check works identically under /en and /ar.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { can } = useAdminSession()

interface NavItem {
  to: string
  label: string
  /** When set, the item renders only if the session carries this capability. */
  requires?: 'branding:write' | 'integrations:write'
}

const items = computed<NavItem[]>(() => [
  { to: '/admin', label: t('admin.nav.dashboard') },
  { to: '/admin/profiles', label: t('admin.nav.profiles') },
  { to: '/admin/qr', label: t('admin.nav.qr') },
  { to: '/admin/wallet', label: t('admin.nav.wallet') },
  { to: '/admin/settings', label: t('admin.nav.settings') },
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
    class="flex flex-col gap-1"
  >
    <NuxtLink
      v-for="item in visibleItems"
      :key="item.to"
      :to="localePath(item.to)"
      :aria-current="isActive(item.to) ? 'page' : undefined"
      class="rounded-md px-3 py-2 text-sm transition-colors
             focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      :class="isActive(item.to)
        ? 'bg-primary text-primary-fg font-medium'
        : 'text-muted-fg hover:bg-muted hover:text-foreground'"
    >
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>
