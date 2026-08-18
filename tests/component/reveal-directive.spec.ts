// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { reveal } from '~/plugins/motion'

/**
 * The scroll-reveal directive's server contract.
 *
 * `getSSRProps` is the entire reason revealed content does not flash. It puts
 * `data-reveal` into the server-rendered HTML so the stylesheet can stage the
 * element before first paint; without it the markup paints fully placed and
 * then jumps to hidden the moment GSAP hydrates.
 *
 * It is worth a test of its own because nothing else fails when it breaks. A
 * component test cannot cover it — `mountSuspended` mounts on the client, where
 * `getSSRProps` never runs — and the visual symptom is a flicker that only shows
 * up on a cold load over a slow connection.
 *
 * The `group` variant needs a different attribute because it stages the
 * element's children rather than the element, and the stylesheet targets the two
 * cases with different selectors.
 */

describe('v-reveal', () => {
  it('stages the element itself by default', () => {
    expect(reveal.getSSRProps?.({ modifiers: {} } as never, null as never))
      .toEqual({ 'data-reveal': '' })
  })

  it('stages children when the group modifier is present', () => {
    expect(reveal.getSSRProps?.({ modifiers: { group: true } } as never, null as never))
      .toEqual({ 'data-reveal-group': '' })
  })

  it('stages on the server regardless of when the animation plays', () => {
    // `now` only changes whether a ScrollTrigger is attached on the client. The
    // element still has to start hidden, or an above-the-fold hero would paint
    // in place and then animate from nothing.
    expect(reveal.getSSRProps?.({ modifiers: { now: true } } as never, null as never))
      .toEqual({ 'data-reveal': '' })
  })
})
