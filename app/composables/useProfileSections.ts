import type { MaybeRefOrGetter } from 'vue'
import type { PublicProfileSection } from '#shared/types/profile-section'

/**
 * Derives everything the section chrome needs from a profile's blocks.
 *
 * WHY A COMPOSABLE AND NOT A COMPUTED IN THE VIEW
 *   Two components need the same two answers — the navigation needs a label for
 *   every section, and each section shell needs the same label for its heading. If
 *   the view derived the labels and passed them down, the nav and the heading could
 *   drift the moment one call site forgot the fallback. One definition, two
 *   consumers.
 *
 * TITLE RESOLUTION
 *   An operator may override a block's heading (`title_en` / `title_ar`). When they
 *   have not, the translated default for the kind is used, which is what lets a
 *   profile be fully bilingual without anyone typing "Areas of expertise" twice.
 *
 * Accepts a ref, a getter or a plain array so a caller is not forced to wrap a
 * value it already has.
 */
export interface ProfileSectionNavItem {
  anchor: string
  label: string
}

/**
 * Resolves one block's heading: the operator's override, or the translated
 * default for its kind.
 *
 * Split out from `useProfileSections` because it depends only on the locale, not
 * on the list. The section renderer needs it without having a list to hand, and
 * making it take one would mean passing an empty array in just to satisfy the
 * signature.
 */
export function useProfileSectionTitle() {
  const { t } = useI18n()

  return (section: PublicProfileSection): string =>
    section.title ?? t(`profile.sections.kinds.${section.kind}`)
}

export function useProfileSections(sections: MaybeRefOrGetter<PublicProfileSection[]>) {
  const titleFor = useProfileSectionTitle()

  /**
   * `?? []` guards deployment skew, not a type hole. `sections` is required on
   * `PublicProfile`, but the public profile response is cacheable — during a
   * rollout a visitor can be served a response rendered before this field
   * existed. Without the fallback that is a white screen on the one page the
   * product exists to serve, which is a far worse trade than one `??`.
   */
  const list = computed(() => toValue(sections) ?? [])

  /**
   * Navigation entries, one per rendered block.
   *
   * The metrics band is deliberately excluded: it sits immediately under the hero
   * as a summary strip rather than as a section a reader would jump to, and it has
   * no heading of its own to land on.
   */
  const navItems = computed<ProfileSectionNavItem[]>(() =>
    list.value
      .filter(section => section.kind !== 'metrics')
      .map(section => ({ anchor: section.anchor, label: titleFor(section) })),
  )

  /** The summary strip, pulled out so the view can place it above the fold. */
  const metrics = computed(() => list.value.find(section => section.kind === 'metrics') ?? null)

  /** Everything else, in render order. */
  const body = computed(() => list.value.filter(section => section.kind !== 'metrics'))

  /** Below roughly three screens the navigation is noise rather than help. */
  const showNav = computed(() => navItems.value.length >= 3)

  return { titleFor, navItems, metrics, body, showNav }
}
