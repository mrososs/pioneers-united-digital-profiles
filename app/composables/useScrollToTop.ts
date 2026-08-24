/**
 * Scrolls the window to the top.
 *
 * Used after a save action settles: the result alert (`AppAlert`, success or danger) renders
 * at the top of the page, above a form that can be taller than the viewport. Without this, an
 * administrator who saved from further down the page has no way to tell whether it succeeded.
 */
export function useScrollToTop() {
  function scrollToTop() {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return { scrollToTop }
}
