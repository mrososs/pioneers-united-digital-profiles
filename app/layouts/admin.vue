<script setup lang="ts">
/**
 * Dashboard layout.
 *
 * Desktop-efficient but responsive: a persistent navy rail from `lg` upwards, collapsing
 * to a disclosure panel below it. Administrators work at a desk, but a publish decision
 * sometimes has to happen from a phone.
 *
 * Signing out clears the Supabase session, resets the cached session state and returns to
 * the login screen. Resetting the state matters — leaving a stale session object behind
 * would let the next render briefly show the previous user's navigation.
 *
 * DESIGN SYSTEM
 *   248px navy-900 rail against a sand page; a 64px white top bar carrying the
 *   language switch and the signed-in administrator. The top bar is the only
 *   place in the whole system that uses a backdrop blur (`.pu-sticky-bar`),
 *   which is what lets content scroll under it without the bar going opaque and
 *   heavy.
 *
 *   Below `lg` the rail becomes a navy header with a disclosure panel, so the
 *   dashboard still reads as the same product on a phone rather than turning
 *   into a white app.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const supabase = useSupabaseClient()
const { session, refresh } = useAdminSession()

const menuOpen = shallowRef(false)
const route = useRoute()

// Close the mobile panel on navigation, otherwise it stays open over the new page.
watch(() => route.fullPath, () => {
  menuOpen.value = false
})

async function signOut() {
  await supabase.auth.signOut()
  await refresh()
  await navigateTo(localePath('/admin/login'))
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-background lg:flex-row">
    <a
      href="#main"
      class="pu-skip-link"
    >
      {{ t('common.actions.skipToContent') }}
    </a>

    <!-- Navy rail: persistent from lg, a header with a disclosure panel below.
         Pinned with `sticky` rather than `fixed` so it never leaves the flex
         row's layout flow; `self-start` stops it stretching to the row's
         height, which would otherwise give `sticky` no room to move. -->
    <aside class="flex flex-col bg-surface-deep text-on-navy-62 lg:sticky lg:top-0 lg:h-dvh lg:w-62 lg:shrink-0 lg:self-start">
      <div class="flex items-center justify-between gap-3 border-b border-border-inverse px-4 py-4">
        <NuxtLink
          :to="localePath('/admin')"
          class="flex items-center gap-3 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-inverse"
        >
          <BrandLogo
            tone="white"
            size="sm"
          />
          <span class="flex flex-col">
            <span class="pu-eyebrow text-3xs text-surface-inverse-fg">{{ t('app.shortName') }}</span>
            <span class="text-3xs text-on-navy-62">{{ t('admin.title') }}</span>
          </span>
        </NuxtLink>

        <AppIconButton
          class="lg:hidden"
          :label="menuOpen ? t('admin.nav.closeMenu') : t('admin.nav.openMenu')"
          variant="inverse"
          size="sm"
          :aria-expanded="menuOpen"
          aria-controls="admin-nav"
          @click="menuOpen = !menuOpen"
        >
          <AppIcon
            :name="menuOpen ? 'x' : 'panel-left'"
            :size="18"
          />
        </AppIconButton>
      </div>

      <div
        id="admin-nav"
        class="flex flex-1 flex-col px-2.5 pt-3.5 pb-4 lg:flex"
        :class="menuOpen ? 'flex' : 'hidden'"
      >
        <AdminNav />

        <div class="mt-auto flex flex-col gap-3 border-t border-border-inverse px-1 pt-3.5">
          <p
            v-if="session"
            class="truncate px-2 text-3xs text-on-navy-62"
            :title="session.email"
          >
            {{ session.fullName || session.email }}
          </p>

          <LocaleSwitcher
            tone="inverse"
            class="px-1 lg:hidden"
          />

          <button
            type="button"
            class="flex h-10 items-center gap-3 rounded-sm px-3 text-sm font-medium text-on-navy-62
                   transition-colors duration-[160ms] ease-standard
                   hover:bg-on-navy-06 hover:text-surface-inverse-fg
                   focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring-inverse"
            @click="signOut"
          >
            <AppIcon
              name="log-out"
              :size="18"
            />
            {{ t('common.actions.signOut') }}
          </button>
        </div>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- The system's one backdrop blur. Hidden below lg, where the navy header
           above already carries the language switch. -->
      <div class="pu-sticky-bar hidden h-16 items-center justify-end gap-3 border-b border-border px-7 lg:flex">
        <LocaleSwitcher />

        <div
          v-if="session"
          class="flex items-center gap-2.5 border-s border-border ps-3.5"
        >
          <AppAvatar
            :name="session.fullName || session.email"
            size="sm"
          />
          <span class="flex flex-col">
            <span class="text-xs font-semibold text-foreground">
              {{ session.fullName || session.email }}
            </span>
            <span class="text-3xs text-muted-fg">{{ t(`admin.roles.${session.role}`) }}</span>
          </span>
        </div>
      </div>

      <main
        id="main"
        class="min-w-0 flex-1"
      >
        <div class="mx-auto flex w-full max-w-admin flex-col gap-6 px-5 pt-6 pb-10 sm:px-7">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
