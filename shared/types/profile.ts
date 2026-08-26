import type { LocaleCode } from '#shared/constants/locales'
import type { ProfileLinkType, ProfileStatus, ProfileType } from '#shared/constants/profiles'
import type { OrganizationSummary } from '#shared/types/organization'
import type { ProfileSection, PublicProfileSection } from '#shared/types/profile-section'

/**
 * Profile DTOs.
 *
 * The database stores paired `*_en` / `*_ar` columns and snake_case names; these
 * types are the camelCase contract the API speaks. Mapping happens in exactly
 * one place (server/repositories/profile.mapper.ts) so a schema change cannot
 * leak row shapes into components.
 */

export interface ProfileLink {
  id: string
  type: ProfileLinkType
  labelEn: string | null
  labelAr: string | null
  url: string
  sortOrder: number
  enabled: boolean
}

/** Everything the dashboard needs. Never returned to anonymous callers. */
export interface Profile {
  id: string
  organizationId: string
  slug: string
  profileType: ProfileType
  status: ProfileStatus

  nameEn: string
  nameAr: string
  jobTitleEn: string | null
  jobTitleAr: string | null
  departmentEn: string | null
  departmentAr: string | null
  headlineEn: string | null
  headlineAr: string | null
  bioEn: string | null
  bioAr: string | null
  locationEn: string | null
  locationAr: string | null

  email: string | null
  phone: string | null
  whatsapp: string | null
  linkedinUrl: string | null
  websiteUrl: string | null
  bookingUrl: string | null

  photoPath: string | null
  /** Resolved public CDN URL for `photoPath`, or null when there is no photo. */
  photoUrl: string | null

  publishedAt: string | null
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string

  links: ProfileLink[]
  sections: ProfileSection[]
}

/** Row shape for the admin profiles table — deliberately narrow. */
export interface ProfileListItem {
  id: string
  slug: string
  profileType: ProfileType
  status: ProfileStatus
  nameEn: string
  nameAr: string
  jobTitleEn: string | null
  jobTitleAr: string | null
  photoUrl: string | null
  publishedAt: string | null
  updatedAt: string
}

/**
 * What an anonymous visitor receives, already resolved for one locale. Internal
 * bookkeeping (status, createdBy, organizationId, storage paths) is stripped.
 */
export interface PublicProfile {
  slug: string
  locale: LocaleCode
  profileType: ProfileType

  name: string
  jobTitle: string | null
  department: string | null
  /** One-sentence positioning line, rendered between the role and the bio. */
  headline: string | null
  bio: string | null
  location: string | null

  email: string | null
  phone: string | null
  whatsapp: string | null
  linkedinUrl: string | null
  websiteUrl: string | null
  bookingUrl: string | null

  photoUrl: string | null

  links: PublicProfileLink[]
  /** Structured content blocks, ordered, already resolved for `locale`. */
  sections: PublicProfileSection[]
  organization: OrganizationSummary

  /** Canonical absolute URL of this profile in this locale. */
  canonicalUrl: string
  /** Absolute URL of the same profile in the other locale, for hreflang. */
  alternateUrls: Record<LocaleCode, string>

  updatedAt: string
}

export interface PublicProfileLink {
  id: string
  type: ProfileLinkType
  label: string | null
  url: string
}
