// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppButton from '~/components/app/AppButton.vue'

/**
 * AppButton is the most reused control in the application, and its contract has real
 * accessibility consequences: a navigation must render as a link, and a pending action must
 * stop accepting clicks. Those are the two things worth locking down.
 */

describe('AppButton', () => {
  it('renders a button element by default', async () => {
    const wrapper = await mountSuspended(AppButton, {
      slots: { default: () => 'Save' },
    })

    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain('Save')
    expect(wrapper.find('button').attributes('type')).toBe('button')
  })

  it('renders an anchor when given href, so downloads and external links behave natively', async () => {
    const wrapper = await mountSuspended(AppButton, {
      props: { href: '/api/profiles/sample-executive/vcard', download: true },
      slots: { default: () => 'Save contact' },
    })

    const anchor = wrapper.find('a')
    expect(anchor.exists()).toBe(true)
    expect(anchor.attributes('href')).toBe('/api/profiles/sample-executive/vcard')
    expect(anchor.attributes('download')).toBeDefined()
  })

  it('is disabled and marked busy while loading, preventing a double submit', async () => {
    const wrapper = await mountSuspended(AppButton, {
      props: { loading: true },
      slots: { default: () => 'Saving' },
    })

    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')
  })

  it('is disabled when the disabled prop is set', async () => {
    const wrapper = await mountSuspended(AppButton, {
      props: { disabled: true },
      slots: { default: () => 'Publish' },
    })

    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('applies semantic token classes rather than raw colours', async () => {
    const wrapper = await mountSuspended(AppButton, {
      props: { variant: 'danger' },
      slots: { default: () => 'Delete' },
    })

    const className = wrapper.find('button').attributes('class') ?? ''
    expect(className).toContain('bg-danger')
    // A raw hex value in a component class is the anti-pattern this guards against.
    expect(className).not.toMatch(/#[0-9a-f]{3,6}/i)
  })

  it('supports submit type for forms', async () => {
    const wrapper = await mountSuspended(AppButton, {
      props: { type: 'submit' },
      slots: { default: () => 'Sign in' },
    })

    expect(wrapper.find('button').attributes('type')).toBe('submit')
  })
})
