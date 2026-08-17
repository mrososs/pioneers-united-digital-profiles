<script setup lang="ts">
/**
 * Dashboard layout.
 *
 * Desktop-efficient but responsive: a persistent sidebar from `lg` upwards, collapsing to
 * a disclosure panel below it. Administrators work at a desk, but a publish decision
 * sometimes has to happen from a phone.
 *
 * Signing out clears the Supabase session, resets the cached session state and returns to
 * the login screen. Resetting the state matters — leaving a stale session object behind
 * would let the next render briefly show the previous user's navigation.
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
  <div class="min-h-dvh bg-background">
    <a
      href="#main"
      class="pu-skip-link"
    >
      {{ t('common.actions.back') }}
    </a>

    <div class="lg:flex">
      <!-- Sidebar: persistent on desktop, disclosure panel on mobile. -->
      <aside class="border-b border-border bg-surface lg:min-h-dvh lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-e">
        <div class="flex items-center justify-between gap-3 px-4 py-3 lg:flex-col lg:items-stretch lg:gap-4">
          <NuxtLink
            :to="localePath('/admin')"
            class="flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <BrandLogo size="sm" />
            <span class="text-sm font-semibold">{{ t('app.shortName') }}</span>
          </NuxtLink>

          <AppIconButton
            class="lg:hidden"
            :label="menuOpen ? t('admin.nav.closeMenu') : t('admin.nav.openMenu')"
            variant="outline"
            size="sm"
            :aria-expanded="menuOpen"
            aria-controls="admin-nav"
            @click="menuOpen = !menuOpen"
          >
            <span aria-hidden="true">☰</span>
          </AppIconButton>
        </div>

        <div
          id="admin-nav"
          class="px-2 pb-3 lg:block"
          :class="menuOpen ? 'block' : 'hidden'"
        >
          <AdminNav />

          <div class="mt-4 flex flex-col gap-2 border-t border-border px-1 pt-3">
            <p
              v-if="session"
              class="truncate px-2 text-xs text-muted-fg"
              :title="session.email"
            >
              {{ session.fullName || session.email }}
            </p>

            <LocaleSwitcher />

            <AppButton
              variant="ghost"
              size="sm"
              @click="signOut"
            >
              {{ t('common.actions.signOut') }}
            </AppButton>
          </div>
        </div>
      </aside>

      <main
        id="main"
        class="min-w-0 flex-1"
      >
        <div class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
