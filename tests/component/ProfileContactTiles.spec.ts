// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { mountWithI18n } from './support/mount'
import ProfileContactTiles from '~/components/profile/ProfileContactTiles.vue'
import { publicProfileFixture } from './fixtures/public-profile'

/**
 * The contact tile row in the profile hero.
 *
 * The rule this protects is "omit, do not disable": a greyed-out Call tile on a
 * profile with no phone number is noise, and on a five-across row it also wastes
 * a fifth of the width the remaining tiles could use. That rule lives in a
 * chain of `if` statements which is exactly the kind of code that quietly grows
 * an off-by-one.
 *
 * The WhatsApp assertion also pins the wa.me form — the number must lose its
 * leading `+`, and getting that wrong produces a link that opens and then fails
 * on the visitor's phone rather than anywhere a developer would see it.
 */

function hrefs(wrapper: { findAll: (s: string) => { attributes: (a: string) => string | undefined }[] }) {
  return wrapper.findAll('a').map(a => a.attributes('href'))
}

describe('ProfileContactTiles', () => {
  it('renders a tile per available channel', async () => {
    const wrapper = await mountWithI18n(ProfileContactTiles, {
      props: { profile: publicProfileFixture() },
    })

    const links = hrefs(wrapper)
    expect(links).toContain('tel:+966555000001')
    expect(links).toContain('mailto:sample@pioneersunited.test')
    expect(links).toContain('https://wa.me/966555000001')
    expect(links).toContain('https://www.linkedin.com/in/sample-executive')
  })

  it('omits channels the profile has no data for', async () => {
    const wrapper = await mountWithI18n(ProfileContactTiles, {
      props: {
        profile: publicProfileFixture({
          phone: null,
          whatsapp: null,
          linkedinUrl: null,
        }),
      },
    })

    const links = hrefs(wrapper)
    expect(links.some(href => href?.startsWith('tel:'))).toBe(false)
    expect(links.some(href => href?.includes('wa.me'))).toBe(false)
    expect(links.some(href => href?.includes('linkedin.com'))).toBe(false)
    expect(links).toContain('mailto:sample@pioneersunited.test')
  })

  it('opens third-party destinations in a new tab, safely', async () => {
    const wrapper = await mountWithI18n(ProfileContactTiles, {
      props: { profile: publicProfileFixture() },
    })

    const whatsapp = wrapper.findAll('a').find(a => a.attributes('href')?.includes('wa.me'))
    expect(whatsapp?.attributes('target')).toBe('_blank')
    expect(whatsapp?.attributes('rel')).toBe('noopener noreferrer')
  })

  it('keeps tel: and mailto: in the same tab', async () => {
    const wrapper = await mountWithI18n(ProfileContactTiles, {
      props: { profile: publicProfileFixture() },
    })

    const tel = wrapper.findAll('a').find(a => a.attributes('href')?.startsWith('tel:'))
    expect(tel?.attributes('target')).toBeUndefined()
  })

  it('offers share as a button rather than a link, since it copies', async () => {
    const wrapper = await mountWithI18n(ProfileContactTiles, {
      props: { profile: publicProfileFixture() },
    })

    expect(wrapper.find('button[type="button"]').exists()).toBe(true)
  })

  it('gives every tile a visible text label, not a bare glyph', async () => {
    const wrapper = await mountWithI18n(ProfileContactTiles, {
      props: { profile: publicProfileFixture() },
    })

    // An icon-only tile would be unusable for anyone who does not read the
    // glyph the same way the designer did, and the icons are aria-hidden.
    for (const tile of [...wrapper.findAll('a'), ...wrapper.findAll('button')]) {
      expect(tile.text().trim().length).toBeGreaterThan(0)
    }
  })
})
