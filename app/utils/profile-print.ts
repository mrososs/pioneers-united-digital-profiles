import type { PublicProfileSection } from '#shared/types/profile-section'

/**
 * Flattens a structured content block into the shape paper wants.
 *
 * WHY PRINT NORMALISES WHERE THE WEB DOES NOT
 *   On screen, nine block types get nine distinct treatments — cards, chips, a
 *   timeline rail, icon plates — because a reader is scrolling through six
 *   screens and needs the visual variety to keep their place. On an A4 page the
 *   reader sees the whole block at once, so that variety stops being navigation
 *   and becomes ink: shadows go muddy, icon plates eat margin, and a card grid
 *   wastes a third of the page on gutters.
 *
 *   Seven of the nine kinds collapse cleanly to the same three lines — a name, a
 *   qualifying line, and optional body copy — so they share one dense renderer.
 *   `metrics` and `expertise` genuinely are different shapes (a figure row and an
 *   inline list) and keep their own treatment in ProfilePrintSections.
 *
 * A pure function, so the mapping is unit-tested without mounting anything.
 */
export interface PrintEntry {
  primary: string | null
  secondary: string | null
  body: string | null
  /**
   * Whether the qualifying line must be laid out left-to-right regardless of the
   * page direction.
   *
   * A phone number or a URL is a Latin-and-digits run. Dropped into an Arabic
   * paragraph, the bidi algorithm moves its leading `+` or trailing `/` to the
   * opposite end — `+966541094444` prints as `966541094444+`, which is simply the
   * wrong number to a reader copying it off paper. The flag travels with the
   * entry because only this mapping knows which field it produced.
   */
  secondaryLtr: boolean
}

/** Joins the parts of a qualifying line, dropping the ones that are absent. */
function qualify(...parts: (string | null)[]): string | null {
  const present = parts.filter((part): part is string => Boolean(part))
  return present.length > 0 ? present.join(' · ') : null
}

export function toPrintEntries(section: PublicProfileSection): PrintEntry[] {
  switch (section.kind) {
    case 'services':
      return section.items.map(item => ({
        primary: item.title,
        secondary: null,
        body: item.description,
        secondaryLtr: false,
      }))

    case 'experience':
      return section.items.map(item => ({
        primary: item.role,
        secondary: qualify(item.organization, item.period),
        body: item.summary,
        secondaryLtr: false,
      }))

    case 'credentials':
      return section.items.map(item => ({
        primary: item.name,
        secondary: qualify(item.issuer, item.year),
        body: null,
        secondaryLtr: false,
      }))

    case 'recognition':
      return section.items.map(item => ({
        primary: item.title,
        secondary: qualify(item.source, item.year),
        body: null,
        secondaryLtr: false,
      }))

    case 'languages':
      return section.items.map(item => ({
        primary: item.name,
        secondary: item.level,
        body: null,
        secondaryLtr: false,
      }))

    case 'offices':
      return section.items.map(item => ({
        primary: item.name,
        secondary: item.phone,
        body: item.address,
        // A phone number, so it must not be re-ordered by an Arabic page.
        secondaryLtr: true,
      }))

    case 'documents':
      // The URL is the secondary line rather than a hidden href: this is the one
      // block whose value is a destination, and a printed page cannot be clicked.
      // Chromium still preserves the anchor, so a PDF reader gets both.
      return section.items.map(item => ({
        primary: item.title,
        secondary: item.url,
        body: item.description,
        // A URL, so it must not be re-ordered by an Arabic page.
        secondaryLtr: true,
      }))

    // Rendered by their own treatments — see ProfilePrintSections.
    case 'metrics':
    case 'expertise':
      return []
  }
}
