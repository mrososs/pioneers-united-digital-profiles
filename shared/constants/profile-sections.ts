/**
 * Profile section domain constants.
 *
 * Every value here has a matching PostgreSQL enum in
 * `supabase/migrations/20260826000100_profile_sections.sql` — keep the two in sync
 * and run `pnpm db:types` whenever the enum changes.
 */

/**
 * The structured content blocks a Digital Profile can carry.
 *
 * Ordering in this array is the DEFAULT render order for a profile whose sections
 * have never been reordered by hand. It reads the way a dossier reads: figures
 * first (they are the fastest credibility signal), then what the subject does, then
 * the evidence for it, then the practical detail.
 */
export const PROFILE_SECTION_KINDS = [
  'metrics',
  'expertise',
  'services',
  'experience',
  'credentials',
  'recognition',
  'languages',
  'offices',
  'documents',
] as const

export type ProfileSectionKind = typeof PROFILE_SECTION_KINDS[number]

/**
 * Which kinds make sense on which profile type.
 *
 * This is guidance for the dashboard's "add a block" menu, not a database
 * constraint: a one-person consultancy legitimately wants `services` on an
 * individual profile, and blocking it in SQL would be a migration to undo. The
 * public renderer draws whatever is present regardless.
 */
export const PROFILE_SECTION_KINDS_BY_TYPE: Record<'individual' | 'company', readonly ProfileSectionKind[]> = {
  individual: ['metrics', 'expertise', 'experience', 'credentials', 'recognition', 'languages', 'documents'],
  company: ['metrics', 'expertise', 'services', 'credentials', 'recognition', 'offices', 'documents'],
}

/** At most one section per kind per profile — enforced by a unique index. */
export const PROFILE_SECTION_MAX_ITEMS = 24

/** Guards the JSONB size cap in the database (32 KB) with room to spare. */
export const PROFILE_SECTION_TEXT_MAX = 600

export function isProfileSectionKind(value: string): value is ProfileSectionKind {
  return (PROFILE_SECTION_KINDS as readonly string[]).includes(value)
}

/**
 * Default render order for a kind. Sections are sorted by their stored
 * `sortOrder` first; this breaks ties and gives newly added blocks a sensible
 * position without the operator having to drag anything.
 */
export function defaultSectionOrder(kind: ProfileSectionKind): number {
  const index = PROFILE_SECTION_KINDS.indexOf(kind)
  return index === -1 ? PROFILE_SECTION_KINDS.length : index
}
