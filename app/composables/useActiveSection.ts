import type { MaybeRefOrGetter } from 'vue'

/**
 * Tracks which section is currently in view, for the anchor navigation.
 *
 * WHY AN OBSERVER RATHER THAN A SCROLL HANDLER
 *   A scroll listener fires on every frame and would have to measure each section's
 *   box each time. IntersectionObserver does the same work off the main thread and
 *   only reports on a crossing, which matters on the phones this page is actually
 *   opened on.
 *
 * The `rootMargin` pulls the detection band to the upper third of the viewport, so
 * a heading becomes "active" as it reaches reading position rather than the instant
 * its first pixel appears at the bottom.
 *
 * SSR
 *   `IntersectionObserver` does not exist on the server, and `onMounted` never runs
 *   there, so the initial render is simply the empty state — no active item. That is
 *   correct: nothing is in view until there is a viewport.
 */
export function useActiveSection(anchors: MaybeRefOrGetter<string[]>) {
  const activeAnchor = shallowRef<string | null>(null)

  let observer: IntersectionObserver | null = null

  const disconnect = () => {
    observer?.disconnect()
    observer = null
  }

  const observe = (ids: string[]) => {
    disconnect()

    if (ids.length === 0 || typeof IntersectionObserver === 'undefined') return

    // Visibility ratios by id, so the *most* visible section wins when two are on
    // screen at once. Picking the first intersecting entry instead makes the label
    // flicker between neighbours mid-scroll.
    const ratios = new Map<string, number>()

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        }

        let best: string | null = null
        let bestRatio = 0

        for (const id of ids) {
          const ratio = ratios.get(id) ?? 0
          if (ratio > bestRatio) {
            best = id
            bestRatio = ratio
          }
        }

        // Keep the last active item when everything has scrolled past, rather than
        // blanking the navigation at the foot of the page.
        if (best !== null) activeAnchor.value = best
      },
      { rootMargin: '-12% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] },
    )

    for (const id of ids) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
  }

  onMounted(() => {
    watch(
      () => toValue(anchors),
      (ids) => {
        // The sections must exist in the DOM before they can be observed.
        nextTick(() => observe(ids))
      },
      { immediate: true },
    )
  })

  onBeforeUnmount(disconnect)

  return { activeAnchor }
}
