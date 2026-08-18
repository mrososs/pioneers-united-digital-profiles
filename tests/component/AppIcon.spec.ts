// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppIcon from '~/components/app/AppIcon.vue'
import { ICON_NAMES, resolveIcon } from '~/utils/icons'

/**
 * The icon set.
 *
 * Two properties matter and neither is visible in a type check.
 *
 *   Every glyph must actually resolve. The map is hand-maintained, so a
 *   mistyped key or a truncated paste yields a component that renders nothing
 *   at all — an invisible failure that looks like a spacing bug.
 *
 *   Decoration must stay decoration. An icon sitting beside a text label is
 *   noise to a screen reader, so `aria-hidden` is the default and `role="img"`
 *   only appears when a title is supplied. Getting that backwards makes every
 *   button announce its glyph twice.
 */

describe('AppIcon', () => {
  it('resolves every advertised glyph to real markup', () => {
    expect(ICON_NAMES.length).toBeGreaterThan(40)

    for (const name of ICON_NAMES) {
      const icon = resolveIcon(name)
      expect(icon, `icon "${name}" did not resolve`).not.toBeNull()
      expect(icon?.body.length, `icon "${name}" has an empty body`).toBeGreaterThan(0)
    }
  })

  it('is hidden from assistive technology by default', async () => {
    const wrapper = await mountSuspended(AppIcon, { props: { name: 'phone' } })

    const svg = wrapper.find('svg')
    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(svg.attributes('role')).toBeUndefined()
  })

  it('becomes a labelled image when a title is supplied', async () => {
    const wrapper = await mountSuspended(AppIcon, {
      props: { name: 'phone', title: 'Call' },
    })

    const svg = wrapper.find('svg')
    expect(svg.attributes('role')).toBe('img')
    expect(svg.attributes('aria-hidden')).toBeUndefined()
    expect(wrapper.find('title').text()).toBe('Call')
  })

  it('strokes line icons and inherits colour', async () => {
    const wrapper = await mountSuspended(AppIcon, { props: { name: 'phone' } })

    const svg = wrapper.find('svg')
    expect(svg.attributes('fill')).toBe('none')
    expect(svg.attributes('stroke')).toBe('currentColor')
    expect(svg.attributes('stroke-width')).toBe('1.75')
  })

  it('fills brand marks instead of stroking them', async () => {
    const wrapper = await mountSuspended(AppIcon, { props: { name: 'whatsapp' } })

    const svg = wrapper.find('svg')
    expect(svg.attributes('fill')).toBe('currentColor')
    expect(svg.attributes('stroke')).toBeUndefined()
  })

  it('renders nothing for an unknown glyph rather than throwing', async () => {
    // A missing glyph should cost a visitor an icon, not the page it sits on.
    const wrapper = await mountSuspended(AppIcon, {
      // @ts-expect-error deliberately outside IconName — this is the guard being tested
      props: { name: 'not-a-real-icon' },
    })

    expect(wrapper.find('svg').exists()).toBe(false)
  })

  it('applies the requested size to both axes', async () => {
    const wrapper = await mountSuspended(AppIcon, { props: { name: 'check', size: 15 } })

    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('15')
    expect(svg.attributes('height')).toBe('15')
    expect(svg.attributes('viewBox')).toBe('0 0 24 24')
  })
})
