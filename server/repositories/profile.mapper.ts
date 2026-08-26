import type { Tables } from '#shared/types/database.types'
import type { LocaleCode } from '#shared/constants/locales'
import { STORAGE_BUCKETS } from '#shared/constants/storage'
import type { Organization, OrganizationSummary } from '#shared/types/organization'
import type { Profile, ProfileLink, ProfileListItem, PublicProfile, PublicProfileLink } from '#shared/types/profile'
import { defaultSectionOrder } from '#shared/constants/profile-sections'
import { profileAlternateUrls, profileUrl, publicStorageUrl } from '../utils/urls'
import { toProfileSection, toPublicProfileSections } from './profile-section.mapper'

/**
 * The single boundary between database rows and API responses.
 *
 * WHY IT IS CENTRALISED
 *   Rows are snake_case, carry paired *_en/*_ar columns, and include fields no
 *   client should see (status on a public response, created_by, storage paths).
 *   Mapping in one module means a schema change surfaces as a compile error here
 *   instead of leaking a column into a component, and it guarantees the public
 *   projection can never accidentally include an internal field.
 */

type ProfileRow = Tables<'profiles'>
type ProfileLinkRow = Tables<'profile_links'>
type ProfileSectionRow = Tables<'profile_sections'>
type OrganizationRow = Tables<'organizations'>

/** Picks the value for a locale, falling back to the other one when empty. */
export function localised(
  locale: LocaleCode,
  english: string | null,
  arabic: string | null,
): string | null {
  const preferred = locale === 'ar' ? arabic : english
  const fallback = locale === 'ar' ? english : arabic

  const trimmedPreferred = preferred?.trim()
  if (trimmedPreferred) return trimmedPreferred

  const trimmedFallback = fallback?.trim()
  return trimmedFallback || null
}

function profilePhotoUrl(row: Pick<ProfileRow, 'photo_path'>): string | null {
  return publicStorageUrl(STORAGE_BUCKETS.profileMedia, row.photo_path)
}

function organizationLogoUrl(row: Pick<OrganizationRow, 'logo_path'>): string | null {
  return publicStorageUrl(STORAGE_BUCKETS.brandAssets, row.logo_path)
}

export function toProfileLink(row: ProfileLinkRow): ProfileLink {
  return {
    id: row.id,
    type: row.type,
    labelEn: row.label_en,
    labelAr: row.label_ar,
    url: row.url,
    sortOrder: row.sort_order,
    enabled: row.enabled,
  }
}

/** Full dashboard-facing projection. */
export function toProfile(
  row: ProfileRow,
  linkRows: ProfileLinkRow[] = [],
  sectionRows: ProfileSectionRow[] = [],
): Profile {
  return {
    id: row.id,
    organizationId: row.organization_id,
    slug: row.slug,
    profileType: row.profile_type,
    status: row.status,

    nameEn: row.name_en,
    nameAr: row.name_ar,
    jobTitleEn: row.job_title_en,
    jobTitleAr: row.job_title_ar,
    departmentEn: row.department_en,
    departmentAr: row.department_ar,
    headlineEn: row.headline_en,
    headlineAr: row.headline_ar,
    bioEn: row.bio_en,
    bioAr: row.bio_ar,
    locationEn: row.location_en,
    locationAr: row.location_ar,

    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    linkedinUrl: row.linkedin_url,
    websiteUrl: row.website_url,
    bookingUrl: row.booking_url,

    photoPath: row.photo_path,
    photoUrl: profilePhotoUrl(row),

    publishedAt: row.published_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    links: [...linkRows]
      .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
      .map(toProfileLink),

    sections: [...sectionRows]
      .sort((a, b) =>
        a.sort_order - b.sort_order
        || defaultSectionOrder(a.kind) - defaultSectionOrder(b.kind)
        || a.id.localeCompare(b.id),
      )
      .map(toProfileSection),
  }
}

export function toProfileListItem(row: ProfileRow): ProfileListItem {
  return {
    id: row.id,
    slug: row.slug,
    profileType: row.profile_type,
    status: row.status,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    jobTitleEn: row.job_title_en,
    jobTitleAr: row.job_title_ar,
    photoUrl: profilePhotoUrl(row),
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  }
}

export function toOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    slug: row.slug,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    taglineEn: row.tagline_en,
    taglineAr: row.tagline_ar,
    website: row.website,
    email: row.email,
    phone: row.phone,
    addressEn: row.address_en,
    addressAr: row.address_ar,
    logoPath: row.logo_path,
    logoUrl: organizationLogoUrl(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toOrganizationSummary(row: OrganizationRow, locale: LocaleCode): OrganizationSummary {
  return {
    slug: row.slug,
    // name_* are NOT NULL, so this can only be null if both are whitespace, which
    // the not-blank check constraints prevent.
    name: localised(locale, row.name_en, row.name_ar) ?? row.name_en,
    tagline: localised(locale, row.tagline_en, row.tagline_ar),
    website: row.website,
    address: localised(locale, row.address_en, row.address_ar),
    logoUrl: organizationLogoUrl(row),
  }
}

function toPublicProfileLink(row: ProfileLinkRow, locale: LocaleCode): PublicProfileLink {
  return {
    id: row.id,
    type: row.type,
    label: localised(locale, row.label_en, row.label_ar),
    url: row.url,
  }
}

/**
 * The anonymous-visitor projection, resolved to one locale.
 *
 * Note what is absent: `status`, `organizationId`, `createdBy`, `updatedBy`,
 * `photoPath`, `createdAt`. Publication state is not something an anonymous caller
 * needs, and storage paths are an implementation detail.
 */
export function toPublicProfile(
  row: ProfileRow,
  organizationRow: OrganizationRow,
  linkRows: ProfileLinkRow[],
  locale: LocaleCode,
  sectionRows: ProfileSectionRow[] = [],
): PublicProfile {
  return {
    slug: row.slug,
    locale,
    profileType: row.profile_type,

    name: localised(locale, row.name_en, row.name_ar) ?? row.name_en,
    jobTitle: localised(locale, row.job_title_en, row.job_title_ar),
    department: localised(locale, row.department_en, row.department_ar),
    headline: localised(locale, row.headline_en, row.headline_ar),
    bio: localised(locale, row.bio_en, row.bio_ar),
    location: localised(locale, row.location_en, row.location_ar),

    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    linkedinUrl: row.linkedin_url,
    websiteUrl: row.website_url,
    bookingUrl: row.booking_url,

    photoUrl: profilePhotoUrl(row),

    links: linkRows
      .filter(link => link.enabled)
      .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
      .map(link => toPublicProfileLink(link, locale)),

    sections: toPublicProfileSections(sectionRows, locale),

    organization: toOrganizationSummary(organizationRow, locale),

    canonicalUrl: profileUrl(locale, row.slug),
    alternateUrls: profileAlternateUrls(row.slug),

    updatedAt: row.updated_at,
  }
}
