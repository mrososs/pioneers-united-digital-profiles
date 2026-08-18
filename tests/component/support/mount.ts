import { createI18n } from 'vue-i18n'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import en from '../../../i18n/locales/en.json'
import ar from '../../../i18n/locales/ar.json'

/**
 * `mountSuspended` with i18n attached.
 *
 * WHY THIS WRAPPER EXISTS
 *   The Nuxt test environment boots the app but not `@nuxtjs/i18n`'s runtime
 *   plugin, so `useNuxtApp().$i18n` is undefined and any component calling
 *   `useI18n()` renders with `t` unset. Every component in this product speaks
 *   through `t()`, so without this wrapper the component suite could only ever
 *   cover the two primitives that happen not to.
 *
 *   The real catalogues are loaded rather than a stub map. That is deliberate:
 *   it means a test asserting on visible copy fails when a key is renamed or
 *   dropped from `en.json`, which is exactly the regression that otherwise ships
 *   as a raw key on a published profile.
 *
 * Pass `locale: 'ar'` to render the Arabic side. Note that `dir` comes from the
 * document in the real app (`useLocaleHead` in `app.vue`), so an RTL assertion
 * belongs in a browser check rather than here.
 */
export function mountWithI18n<T>(
  component: T,
  options: {
    locale?: 'en' | 'ar'
    props?: Record<string, unknown>
    /** Components to replace with a placeholder. See `LOCALE_ROUTING_STUBS`. */
    stubs?: Record<string, unknown>
  } = {},
) {
  const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: options.locale ?? 'en',
    fallbackLocale: 'en',
    messages: { en, ar },
  })

  return mountSuspended(component as never, {
    props: options.props,
    global: {
      plugins: [i18n],
      stubs: options.stubs,
    },
  })
}

/**
 * Components that cannot render without `@nuxtjs/i18n`'s routing runtime.
 *
 * A `vue-i18n` instance supplies `t()`, but not `switchLocalePath()` — that
 * comes from the Nuxt module, which the test environment does not boot. Only
 * `LocaleSwitcher` depends on it, and it is layout chrome: stubbing it lets a
 * test cover what the component under test actually does instead of the
 * language toggle that happens to sit above it.
 */
export const LOCALE_ROUTING_STUBS = { LocaleSwitcher: true } as const
