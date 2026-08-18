/**
 * Motion constants shared by the plugin, the composables and any component that
 * builds its own timeline.
 *
 * Kept in `utils/` rather than inside the plugin so that a component can import
 * the easing name without pulling GSAP into a module that may not need it, and
 * so the reduced-motion check has exactly one definition. A second, slightly
 * different copy of that check is how an accessibility preference quietly stops
 * being honoured on one screen.
 */

/** The media query the whole application agrees to respect. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Name of the registered CustomEase matching the design system's standard
 * curve, `cubic-bezier(.2,0,0,1)`. Registered once by `plugins/motion.ts`.
 */
export const PU_EASE = 'pu-standard'

/** Design-system durations, in seconds — GSAP's unit. 160ms controls, 240ms surfaces. */
export const PU_DURATION = {
  instant: 0.09,
  fast: 0.16,
  base: 0.24,
  slow: 0.36,
  /** Scroll reveal travels further than a control state, so it runs longer. */
  reveal: 0.56,
} as const

/**
 * Whether the visitor has asked for reduced motion.
 *
 * Returns `true` on the server. Erring towards "no motion" means server-rendered
 * output never assumes an animation will run to reveal it.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}
