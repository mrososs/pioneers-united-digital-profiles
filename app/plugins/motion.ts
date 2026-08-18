import type { Directive, DirectiveBinding } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'
import { PU_EASE, REDUCED_MOTION_QUERY, prefersReducedMotion } from '~/utils/motion'

/**
 * The motion layer: GSAP, ScrollTrigger and the `v-reveal` / `v-count-up`
 * directives.
 *
 * WHY THIS PLUGIN IS UNIVERSAL AND NOT `.client`
 *   A custom directive can contribute attributes to the server-rendered HTML
 *   through `getSSRProps`. That is the whole trick behind reveal-on-scroll
 *   without a flash: `data-reveal` is present in the very first byte of HTML,
 *   the stylesheet hides those elements before paint, and GSAP brings them in.
 *   A client-only plugin would register the directive too late for SSR, the
 *   markup would paint fully placed and then jump to hidden on hydration.
 *   `mounted` never runs on the server, so no GSAP call is made there.
 *
 * THE THREE-WAY GUARD ON MOTION
 *   Reveal animations must never be able to hide content permanently, so three
 *   independent things all have to be true before an element starts hidden:
 *     1. the visitor has not requested reduced motion — checked by the inline
 *        script in nuxt.config, again here, and again by the media query
 *        listener below if they change the setting mid-session;
 *     2. JavaScript ran at all — the `pu-motion` class only exists because a
 *        script set it;
 *     3. this plugin reached `data-motion-ready` before the inline failsafe
 *        expired — if the GSAP chunk never arrives, the class is pulled and
 *        every `[data-reveal]` element paints normally.
 *   Every directive re-reads condition 2 at mount time, so the failsafe wins.
 *
 * DESIGN-SYSTEM CONSTRAINT
 *   The system's motion rule is "nothing scales, bounces or slides
 *   decoratively" and it names exactly two self-animating elements (the
 *   skeleton shimmer and the generating pulse). Scroll reveal is an addition on
 *   top of that, so it is kept to the smallest gesture that still reads as
 *   motion: opacity plus a short rise on the system's own easing curve. No
 *   scale, no rotation, no parallax, no pinning.
 */

export interface RevealOptions {
  /** Rise distance in px. `0` gives a pure fade. */
  y?: number
  /** Inline-axis offset in px, mirrored automatically under RTL. */
  x?: number
  /** Seconds before the tween starts. */
  delay?: number
  /** Seconds the tween runs. */
  duration?: number
  /** Seconds between children. Only meaningful with the `group` modifier. */
  stagger?: number
  /** ScrollTrigger `start`. Ignored when the `now` modifier is present. */
  start?: string
}

const DEFAULTS = {
  y: 14,
  x: 0,
  delay: 0,
  duration: 0.56,
  stagger: 0.07,
  start: 'top 88%',
} satisfies Required<RevealOptions>

function resolveOptions(binding: DirectiveBinding<RevealOptions | number | undefined>): Required<RevealOptions> {
  // A bare number is the common case — `v-reveal="0.15"` reads better than
  // `v-reveal="{ delay: 0.15 }"` for the one option that gets tuned most.
  if (typeof binding.value === 'number') return { ...DEFAULTS, delay: binding.value }
  return { ...DEFAULTS, ...(binding.value ?? {}) }
}

/** True only when this element is allowed to start hidden and animate in. */
function motionEnabled(): boolean {
  return !prefersReducedMotion() && document.documentElement.classList.contains('pu-motion')
}

/**
 * Restores an element to its natural state and stops the stylesheet hiding it.
 * Called both on completion and on the bail-out paths, so there is exactly one
 * definition of "finished".
 */
function settle(el: HTMLElement, targets: Element[], attribute: string) {
  gsap.set(targets, { clearProps: 'opacity,transform,willChange' })
  el.removeAttribute(attribute)
}

export const reveal: Directive<HTMLElement, RevealOptions | number | undefined> = {
  /**
   * Runs during SSR. `group` stages the element's children rather than the
   * element itself, so it needs a different attribute for the stylesheet to
   * target.
   */
  getSSRProps(binding) {
    return binding.modifiers.group ? { 'data-reveal-group': '' } : { 'data-reveal': '' }
  },

  mounted(el, binding) {
    const isGroup = Boolean(binding.modifiers.group)
    const attribute = isGroup ? 'data-reveal-group' : 'data-reveal'

    // Client-only navigation renders without getSSRProps, so the attribute has
    // to be set here too — otherwise the element is never hidden and the tween
    // below would fade it out before fading it back in.
    if (motionEnabled() && !el.hasAttribute(attribute)) el.setAttribute(attribute, '')

    const targets = isGroup ? Array.from(el.children) : [el]
    if (targets.length === 0) return

    if (!motionEnabled()) {
      settle(el, targets, attribute)
      return
    }

    const options = resolveOptions(binding)
    // `x` is an inline-axis offset: "forward" is leftwards in Arabic.
    const direction = document.documentElement.dir === 'rtl' ? -1 : 1

    const tween = gsap.fromTo(
      targets,
      { opacity: 0, y: options.y, x: options.x * direction },
      {
        opacity: 1,
        y: 0,
        x: 0,
        duration: options.duration,
        delay: options.delay,
        stagger: isGroup ? options.stagger : 0,
        ease: PU_EASE,
        onComplete: () => settle(el, targets, attribute),
        // `now` plays on mount — used for above-the-fold content such as the
        // profile hero, which is already in view and would otherwise wait for a
        // scroll event that never comes.
        scrollTrigger: binding.modifiers.now
          ? undefined
          : { trigger: el, start: options.start, once: true },
      },
    )

    // Kept so `unmounted` can tear down the tween *and* its ScrollTrigger; a
    // trigger that outlives its element pins a detached node in memory and
    // throws on the next refresh.
    revealTweens.set(el, tween)
  },

  unmounted(el) {
    revealTweens.get(el)?.scrollTrigger?.kill()
    revealTweens.get(el)?.kill()
    revealTweens.delete(el)
  },
}

const revealTweens = new WeakMap<HTMLElement, gsap.core.Tween>()

/**
 * Counts a figure up when it scrolls into view.
 *
 * The value is passed in rather than parsed out of the element's text on
 * purpose: the rendered text is already localised, and an Arabic page shows
 * "١٢" — reading the number back out of the DOM would mean un-formatting it
 * first. Formatting is done here with the document's own language so the
 * intermediate frames match the final value exactly.
 */
const countUp: Directive<HTMLElement, number> = {
  getSSRProps() {
    return {}
  },

  mounted(el, binding) {
    const target = Number(binding.value)
    if (!Number.isFinite(target)) return

    const format = new Intl.NumberFormat(document.documentElement.lang || 'en')
    const render = (value: number) => {
      el.textContent = format.format(Math.round(value))
    }

    if (!motionEnabled() || target === 0) {
      render(target)
      return
    }

    const state = { value: 0 }
    render(0)

    countUpTweens.set(el, gsap.to(state, {
      value: target,
      duration: 0.9,
      ease: PU_EASE,
      onUpdate: () => render(state.value),
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
    }))
  },

  /**
   * A dashboard figure is re-rendered when its request resolves. Without this
   * the element would keep whatever number the first tween landed on.
   */
  updated(el, binding) {
    if (binding.value === binding.oldValue) return
    const format = new Intl.NumberFormat(document.documentElement.lang || 'en')
    el.textContent = format.format(Number(binding.value) || 0)
  },

  unmounted(el) {
    countUpTweens.get(el)?.scrollTrigger?.kill()
    countUpTweens.get(el)?.kill()
    countUpTweens.delete(el)
  },
}

const countUpTweens = new WeakMap<HTMLElement, gsap.core.Tween>()

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.client) {
    gsap.registerPlugin(ScrollTrigger, CustomEase)

    // The design system's standard curve, cubic-bezier(.2,0,0,1), expressed as
    // the SVG path CustomEase takes. Registering it by name means every tween
    // in the application — directives here, timelines in components — refers to
    // one curve rather than approximating it with `power2.out`.
    CustomEase.create(PU_EASE, 'M0,0 C0.2,0 0,1 1,1')

    // Tells the inline failsafe in nuxt.config that motion arrived, so it stops
    // counting down to stripping `pu-motion`.
    document.documentElement.setAttribute('data-motion-ready', '')

    // Honour the preference changing mid-session: reveal everything still
    // pending and stop hiding anything new.
    const query = window.matchMedia(REDUCED_MOTION_QUERY)
    const onPreferenceChange = () => {
      if (!query.matches) return
      document.documentElement.classList.remove('pu-motion')
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
      gsap.set('[data-reveal], [data-reveal-group] > *', { clearProps: 'all' })
    }
    query.addEventListener('change', onPreferenceChange)

    // Layout height changes as a route's data resolves and its images decode.
    // Without a refresh, triggers below the fold keep the positions they were
    // measured at and fire at the wrong scroll offset — or never.
    nuxtApp.hook('page:finish', () => {
      requestAnimationFrame(() => ScrollTrigger.refresh())
    })
  }

  nuxtApp.vueApp.directive('reveal', reveal)
  nuxtApp.vueApp.directive('count-up', countUp)

  return {
    provide: {
      gsap,
      ScrollTrigger,
    },
  }
})
