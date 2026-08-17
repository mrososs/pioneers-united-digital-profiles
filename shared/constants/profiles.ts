/**
 * Profile domain constants. Every value here has a matching PostgreSQL enum in
 * `supabase/migrations` — keep the two in sync, and regenerate the database
 * types (`pnpm db:types`) whenever the enums change.
 */

export const PROFILE_TYPES = ['individual', 'company'] as const
export type ProfileType = typeof PROFILE_TYPES[number]

export const PROFILE_STATUSES = ['draft', 'published', 'inactive'] as const
export type ProfileStatus = typeof PROFILE_STATUSES[number]

/**
 * Link types renderable on a public profile. `custom` covers anything that does
 * not deserve a dedicated icon.
 */
export const PROFILE_LINK_TYPES = [
  'website',
  'linkedin',
  'x',
  'instagram',
  'facebook',
  'youtube',
  'whatsapp',
  'telegram',
  'email',
  'phone',
  'location',
  'custom',
] as const
export type ProfileLinkType = typeof PROFILE_LINK_TYPES[number]

/** Slugs that may never be claimed by a profile — they collide with app routes. */
export const RESERVED_PROFILE_SLUGS = [
  'admin',
  'api',
  'assets',
  '_nuxt',
  'login',
  'logout',
  'confirm',
  'settings',
  'company',
  'profiles',
  'qr',
  'wallet',
  'vcard',
  'robots.txt',
  'sitemap.xml',
  'favicon.ico',
] as const

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const PROFILE_SLUG_MIN_LENGTH = 2
export const PROFILE_SLUG_MAX_LENGTH = 80

export const PROFILE_LIST_PAGE_SIZE = 20

export function isReservedProfileSlug(slug: string): boolean {
  return (RESERVED_PROFILE_SLUGS as readonly string[]).includes(slug)
}
