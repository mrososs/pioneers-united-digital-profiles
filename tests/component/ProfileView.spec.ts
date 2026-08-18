// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { LOCALE_ROUTING_STUBS, mountWithI18n } from './support/mount'
import ProfileView from '~/components/profile/ProfileView.vue'
import { publicProfileFixture } from './fixtures/public-profile'

/**
 * `useLocalePath` comes from `@nuxtjs/i18n`, whose runtime the test environment
 * does not boot — calling it aborts setup and the component renders with `t`
 * unbound, which surfaces as a confusing "$setup.t is not a function".
 *
 * The identity implementation is deliberate rather than lazy: these tests assert
 * on `href$="/pioneers-united"`, so the mock has to produce a path the real one
 * would also produce, just without the locale prefix. Prefixing here would only
 * test the mock.
 */
mockNuxtImport('useLocalePath', () => () => (path: string) => path)

/**
 * The public Digital Profile, composed.
 *
 * WHAT THESE TESTS PROTECT
 *   `ProfileView` is the one place that decides which blocks a profile shows.
 *   Its branches are cheap to get wrong and expensive to notice: a company
 *   profile linking to itself, or a QR panel rendered twice because the mobile
 *   copy and the desktop panel are both in the DOM, are both defects a
 *   type check cannot see and a passing build will happily ship.
 *
 *   The scroll-reveal contract is covered separately in
 *   `reveal-directive.spec.ts` — it is a server-render concern and cannot be
 *   observed from a client-side mount.
 */

describe('ProfileView', () => {
  it('renders the identity, the save-contact action and the QR panel', async () => {
    const wrapper = await mountWithI18n(ProfileView, {
      props: { profile: publicProfileFixture(), walletAvailability: null },
      stubs: LOCALE_ROUTING_STUBS,
    })

    expect(wrapper.find('h1').text()).toBe('Sample Executive')
    expect(wrapper.text()).toContain('Chief Example Officer')
    expect(wrapper.text()).toContain('Riyadh, Saudi Arabia')

    const vcardLink = wrapper.find('a[download]')
    expect(vcardLink.exists()).toBe(true)
    expect(vcardLink.attributes('href')).toContain('/api/profiles/sample-executive/vcard')

    // The QR is an <img> at the server endpoint, never an inline data URI.
    const qr = wrapper.find('img[src*="/qr"]')
    expect(qr.exists()).toBe(true)
    expect(qr.attributes('src')).toContain('format=svg')
  })

  it('renders exactly one QR panel, not one per breakpoint', async () => {
    const wrapper = await mountWithI18n(ProfileView, {
      props: { profile: publicProfileFixture(), walletAvailability: null },
      stubs: LOCALE_ROUTING_STUBS,
    })

    // Counting the download anchors, not the <img>: an earlier version of this
    // layout rendered a mobile copy and a desktop copy and hid one with
    // `lg:hidden`, which left both in the DOM at every viewport — two QR panels
    // announced to a screen reader, and the QR endpoint fetched twice. An
    // <img>-only assertion missed it. These four anchors are the tell.
    expect(wrapper.findAll('a[href*="/qr?"]')).toHaveLength(2)
    expect(wrapper.findAll('img[src*="/qr"]')).toHaveLength(1)
  })

  it('renders the wallet block once', async () => {
    const wrapper = await mountWithI18n(ProfileView, {
      props: {
        profile: publicProfileFixture(),
        walletAvailability: { apple: true, google: true },
      },
      stubs: LOCALE_ROUTING_STUBS,
    })

    expect(wrapper.findAll('a[href*="/api/wallet/"]')).toHaveLength(2)
  })

  it('shows the company card on an individual profile', async () => {
    const wrapper = await mountWithI18n(ProfileView, {
      props: { profile: publicProfileFixture(), walletAvailability: null },
      stubs: LOCALE_ROUTING_STUBS,
    })

    const companyLink = wrapper.find('a[href$="/pioneers-united"]')
    expect(companyLink.exists()).toBe(true)
    expect(companyLink.text()).toContain('Pioneers United')
  })

  it('omits the company card on the company profile itself', async () => {
    const wrapper = await mountWithI18n(ProfileView, {
      props: {
        profile: publicProfileFixture({ profileType: 'company', slug: 'pioneers-united' }),
        walletAvailability: null,
      },
      stubs: LOCALE_ROUTING_STUBS,
    })

    expect(wrapper.find('a[href$="/pioneers-united"]').exists()).toBe(false)
  })

  it('omits the links block when a profile has none', async () => {
    const wrapper = await mountWithI18n(ProfileView, {
      props: { profile: publicProfileFixture({ links: [] }), walletAvailability: null },
      stubs: LOCALE_ROUTING_STUBS,
    })

    expect(wrapper.find('a[href="https://pioneersunited.com"]').exists()).toBe(false)
  })

  it('replaces the wallet buttons with an explanation when no provider is configured', async () => {
    const wrapper = await mountWithI18n(ProfileView, {
      props: {
        profile: publicProfileFixture(),
        walletAvailability: { apple: false, google: false },
      },
      stubs: LOCALE_ROUTING_STUBS,
    })

    expect(wrapper.find('a[href*="/api/wallet/"]').exists()).toBe(false)
    expect(wrapper.find('[role="status"], [role="alert"]').exists()).toBe(true)
  })

  it('renders a wallet link only for the provider the server reports as ready', async () => {
    const wrapper = await mountWithI18n(ProfileView, {
      props: {
        profile: publicProfileFixture(),
        walletAvailability: { apple: true, google: false },
      },
      stubs: LOCALE_ROUTING_STUBS,
    })

    expect(wrapper.find('a[href*="/api/wallet/apple/"]').exists()).toBe(true)
    expect(wrapper.find('a[href*="/api/wallet/google/"]').exists()).toBe(false)
  })
})
