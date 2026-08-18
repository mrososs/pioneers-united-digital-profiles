import type { MaybeRefOrGetter } from 'vue'
import { PU_EASE, PU_DURATION, prefersReducedMotion } from '~/utils/motion'

/**
 * Component-scoped GSAP.
 *
 * `v-reveal` covers the common case — bring this block in when it scrolls into
 * view. Reach for `useMotion` when a component needs a real timeline: several
 * elements moving in a specific order, or a property `v-reveal` does not touch
 * (the copper rule drawing out from zero width is the motivating example).
 *
 * WHAT IT GUARANTEES
 *   * Nothing runs on the server, and nothing runs when the visitor has asked
 *     for reduced motion — `animate()` simply does not call your builder, so a
 *     component never has to remember the check.
 *   * Everything is torn down. GSAP's `context` records every tween and
 *     ScrollTrigger created inside the callback; `revert()` on scope dispose
 *     kills them and restores the inline styles they touched. Without that, a
 *     ScrollTrigger outlives its component, holds a detached DOM node alive and
 *     throws on the next refresh.
 *   * Selectors inside the callback are scoped to `root`, so a timeline can say
 *     `'[data-hero-name]'` without reaching into another instance of the same
 *     component elsewhere on the page.
 *
 * @param root  Element the callback's selectors resolve against. Usually a
 *              `useTemplateRef` on the component's outermost node.
 */
export function useMotion(root: MaybeRefOrGetter<HTMLElement | null | undefined>) {
  const { $gsap } = useNuxtApp()

  const contexts: gsap.Context[] = []

  /** Motion is off for reduced-motion visitors and when the page's failsafe stripped it. */
  function enabled(): boolean {
    if (import.meta.server) return false
    if (prefersReducedMotion()) return false
    return document.documentElement.classList.contains('pu-motion')
  }

  /**
   * Builds a timeline inside a scoped GSAP context.
   *
   * The callback receives a fresh paused timeline pre-set to the design
   * system's easing and surface duration, so a caller specifies only what
   * differs. Call it from `onMounted` — it needs the DOM.
   */
  function animate(build: (timeline: gsap.core.Timeline) => void): void {
    if (!enabled()) return

    const element = toValue(root)
    if (!element) return

    const context = $gsap.context(() => {
      const timeline = $gsap.timeline({
        defaults: { ease: PU_EASE, duration: PU_DURATION.base },
      })
      build(timeline)
    }, element)

    contexts.push(context)
  }

  onScopeDispose(() => {
    contexts.forEach(context => context.revert())
    contexts.length = 0
  })

  return { animate, enabled, gsap: $gsap, PU_EASE, PU_DURATION }
}
