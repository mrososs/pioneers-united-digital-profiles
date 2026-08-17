// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppAvatar from '~/components/app/AppAvatar.vue'

/**
 * The initials fallback is not cosmetic: a profile can be published before its photograph
 * is uploaded, and an executive's card showing a broken-image icon is a visible defect.
 * Arabic names must produce sensible initials too.
 */

describe('AppAvatar', () => {
  it('renders the photograph when a source is supplied', async () => {
    const wrapper = await mountSuspended(AppAvatar, {
      props: {
        src: 'https://storage.test/photo.jpg',
        name: 'Sample Executive',
        alt: 'Photograph of Sample Executive',
      },
    })

    const image = wrapper.find('img')
    expect(image.exists()).toBe(true)
    expect(image.attributes('src')).toBe('https://storage.test/photo.jpg')
    expect(image.attributes('alt')).toBe('Photograph of Sample Executive')
    expect(image.attributes('loading')).toBe('lazy')
  })

  it('falls back to initials when there is no photograph', async () => {
    const wrapper = await mountSuspended(AppAvatar, {
      props: { name: 'Sample Executive' },
    })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('SE')
  })

  it('derives initials from Arabic names', async () => {
    const wrapper = await mountSuspended(AppAvatar, {
      props: { name: 'محمد القحطاني' },
    })

    expect(wrapper.text()).toBe('ما')
  })

  it('uses the name as alt text when none is given', async () => {
    const wrapper = await mountSuspended(AppAvatar, {
      props: { src: 'https://storage.test/photo.jpg', name: 'Sample Executive' },
    })

    expect(wrapper.find('img').attributes('alt')).toBe('Sample Executive')
  })

  it('shows initials after the image fails to load', async () => {
    const wrapper = await mountSuspended(AppAvatar, {
      props: { src: 'https://storage.test/deleted.jpg', name: 'Sample Executive' },
    })

    await wrapper.find('img').trigger('error')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('SE')
  })
})
