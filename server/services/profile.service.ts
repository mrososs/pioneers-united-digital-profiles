import type { H3Event } from 'h3'
import { randomBytes } from 'node:crypto'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { Tables, TablesInsert } from '#shared/types/database.types'
import type { LocaleCode } from '#shared/constants/locales'
import { alternateLocale } from '#shared/constants/locales'
import { isReservedProfileSlug, PROFILE_SLUG_MAX_LENGTH, SLUG_PATTERN } from '#shared/constants/profiles'
import type { PaginatedResult } from '#shared/types/api'
import type { Profile, ProfileListItem, PublicProfile } from '#shared/types/profile'
import type { ProfileCreateInput, ProfileListQuery, ProfileUpdateInput } from '#shared/schemas/profile.schema'
import type { AdminSession } from '#shared/types/session'
import * as profilesRepository from '../repositories/profiles.repository'
import type { Client } from '../repositories/profiles.repository'
import { toProfile, toProfileListItem, toPublicProfile } from '../repositories/profile.mapper'
import { assertCanManageOrganization } from '../utils/auth'
import { apiError, fromPostgrestError, isSlugCollisionError, notFound } from '../utils/errors'
import { profileUrl } from '../utils/urls'

/**
 * Profile business rules.
 *
 * This layer owns everything that is neither transport (server/api) nor SQL
 * (server/repositories): locale resolution, DTO shaping, tenancy enforcement,
 * publication semantics, and the choice of privilege level for each operation.
 *
 * Pages and components never talk to Supabase directly — they call the API routes
 * that call this service. That is what keeps the same rules in force no matter which
 * surface (public page, dashboard, future mobile client) is asking.
 */

type ProfileRow = Tables<'profiles'>
type ProfileLinkRow = Tables<'profile_links'>
type ProfileSectionRow = Tables<'profile_sections'>
type OrganizationRow = Tables<'organizations'>

/** Shape of the joined row PostgREST returns for the public query. */
interface JoinedPublicProfileRow extends ProfileRow {
  organizations: OrganizationRow | null
  profile_links: ProfileLinkRow[] | null
  profile_sections: ProfileSectionRow[] | null
}

/** The same row after the join has been proven present. */
interface PublishedProfileRow extends ProfileRow {
  organization: OrganizationRow
  links: ProfileLinkRow[]
  sections: ProfileSectionRow[]
}

/**
 * Public profile lookup.
 *
 * Uses the REQUEST-SCOPED client, not the service role. That is deliberate: the
 * anonymous visitor's own privileges decide what comes back, so Row Level Security
 * is exercised on the real read path. If the "published only" policy ever regressed,
 * this route would start failing tests rather than silently over-sharing.
 */
async function fetchPublishedRow(event: H3Event, slug: string): Promise<PublishedProfileRow> {
  const client = await serverSupabaseClient(event)

  let row: JoinedPublicProfileRow | null
  try {
    row = (await profilesRepository.findPublishedProfileBySlug(client, slug)) as JoinedPublicProfileRow | null
  }
  catch (error) {
    throw fromPostgrestError(error, event)
  }

  // A draft profile and a nonexistent slug are indistinguishable from the outside.
  // Reporting "exists but unpublished" would leak the roster of upcoming profiles.
  if (!row || !row.organizations) throw notFound(event)

  return {
    ...row,
    organization: row.organizations,
    links: row.profile_links ?? [],
    sections: row.profile_sections ?? [],
  }
}

export async function getPublicProfile(
  event: H3Event,
  slug: string,
  locale: LocaleCode,
): Promise<PublicProfile> {
  const row = await fetchPublishedRow(event, slug)

  return toPublicProfile(row, row.organization, row.links, locale, row.sections)
}

/** The data a vCard needs, resolved for one locale. */
export interface VCardSource {
  slug: string
  locale: LocaleCode
  name: string
  alternateName: string | null
  jobTitle: string | null
  department: string | null
  organizationName: string
  email: string | null
  phone: string | null
  whatsapp: string | null
  websiteUrl: string | null
  linkedinUrl: string | null
  address: string | null
  bio: string | null
  profileUrl: string
  updatedAt: string
}

/**
 * Resolves a published profile into vCard input.
 *
 * Both locales are produced from a SINGLE database read: the alternate-language name
 * goes into the card's NOTE, and fetching the row twice to get it would double the
 * cost of every contact download.
 *
 * Reads through the public path, so an unpublished profile has no downloadable card.
 */
export async function getVCardSource(
  event: H3Event,
  slug: string,
  locale: LocaleCode,
): Promise<VCardSource> {
  const row = await fetchPublishedRow(event, slug)

  const profile = toPublicProfile(row, row.organization, row.links, locale)
  const alternate = toPublicProfile(row, row.organization, row.links, alternateLocale(locale))

  return {
    slug: profile.slug,
    locale,
    name: profile.name,
    alternateName: alternate.name === profile.name ? null : alternate.name,
    jobTitle: profile.jobTitle,
    department: profile.department,
    organizationName: profile.organization.name,
    email: profile.email,
    phone: profile.phone,
    whatsapp: profile.whatsapp,
    websiteUrl: profile.websiteUrl,
    linkedinUrl: profile.linkedinUrl,
    address: profile.location ?? profile.organization.address,
    bio: profile.bio,
    profileUrl: profile.canonicalUrl,
    updatedAt: profile.updatedAt,
  }
}

// -----------------------------------------------------------------------------
// Administrative operations
//
// These use the service-role client, which bypasses RLS. That is only sound because
// every entry point has already called requireAdmin()/requireCapability() and every
// function below re-checks tenancy with assertCanManageOrganization(). Both halves
// are required: authentication proves who, tenancy proves which rows.
// -----------------------------------------------------------------------------

export async function listProfilesForAdmin(
  event: H3Event,
  session: AdminSession,
  query: ProfileListQuery,
): Promise<PaginatedResult<ProfileListItem>> {
  const client = serverSupabaseServiceRole(event)

  try {
    const { rows, total } = await profilesRepository.listProfiles(client, session.organizationId, query)

    return {
      items: rows.map(toProfileListItem),
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.perPage)),
    }
  }
  catch (error) {
    throw fromPostgrestError(error, event)
  }
}

export async function getProfileForAdmin(
  event: H3Event,
  session: AdminSession,
  id: string,
): Promise<Profile> {
  const client = serverSupabaseServiceRole(event)

  type JoinedAdminRow = ProfileRow & {
    profile_links: ProfileLinkRow[] | null
    profile_sections: ProfileSectionRow[] | null
  }

  let row: JoinedAdminRow | null
  try {
    row = (await profilesRepository.findProfileById(client, id)) as JoinedAdminRow | null
  }
  catch (error) {
    throw fromPostgrestError(error, event)
  }

  if (!row) throw notFound(event)

  assertCanManageOrganization(event, session, row.organization_id)

  return toProfile(row, row.profile_links ?? [], row.profile_sections ?? [])
}

/**
 * Reduces a display name to the slug alphabet. Diacritics are stripped rather
 * than transliterated (an Arabic name in `nameEn` collapses to the random
 * suffix alone) — nothing here needs to be reversible, only unique and legible
 * for the common case of a Latin name.
 */
/** Combining diacritical marks left behind by `normalize('NFKD')`. */
const COMBINING_DIACRITICS_PATTERN = /[̀-ͯ]/g

function slugifyName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(COMBINING_DIACRITICS_PATTERN, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function randomSlugSuffix(): string {
  return randomBytes(4).toString('hex')
}

/**
 * Generates the public link for a new profile: `<name>-<random suffix>`.
 *
 * The link is printed on business cards and encoded in QR codes (see "Core
 * rules" in the root CLAUDE.md), so an administrator no longer types it —
 * removing that field also removes the chance of a typo becoming permanent.
 * Uniqueness is checked against the database before the value is returned;
 * `createProfile` additionally retries on an insert-time collision, closing
 * the race between this check and the write.
 */
async function generateUniqueProfileSlug(event: H3Event, client: Client, nameEn: string): Promise<string> {
  const base = slugifyName(nameEn).slice(0, PROFILE_SLUG_MAX_LENGTH - 9).replace(/-+$/, '') || 'profile'
  const maxAttempts = 8

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = `${base}-${randomSlugSuffix()}`

    if (!SLUG_PATTERN.test(candidate) || isReservedProfileSlug(candidate)) continue

    const existing = await profilesRepository.findProfileBySlug(client, candidate)
    if (!existing) return candidate
  }

  throw apiError({
    code: 'internal_error',
    event,
    internal: { reason: 'slug_generation_exhausted', nameEn },
  })
}

function toLinkInsert(link: ProfileCreateInput['links'][number], index: number) {
  return {
    type: link.type,
    label_en: link.labelEn,
    label_ar: link.labelAr,
    url: link.url,
    // Trust the array order over a client-supplied sortOrder: the editor reorders by
    // dragging, and two rows claiming the same index would render unpredictably.
    sort_order: index,
    enabled: link.enabled,
  }
}

/**
 * Section rows to insert. Same reasoning as links: the submitted array order is
 * the operator's intent, so it becomes `sort_order` rather than trusting a
 * client-supplied index.
 *
 * `payload` has already been through the discriminated union in
 * profile-section.schema.ts by the time it arrives, so what is written here is
 * known to match its kind.
 */
function toSectionInsert(section: ProfileCreateInput['sections'][number], index: number) {
  return {
    kind: section.kind,
    title_en: section.titleEn,
    title_ar: section.titleAr,
    payload: section.payload as TablesInsert<'profile_sections'>['payload'],
    sort_order: index,
    enabled: section.enabled,
  }
}

export async function createProfile(
  event: H3Event,
  session: AdminSession,
  input: ProfileCreateInput,
): Promise<Profile> {
  // The organization comes from the request, so it is checked rather than trusted.
  assertCanManageOrganization(event, session, input.organizationId)

  const client = serverSupabaseServiceRole(event)

  // A slug supplied by a scripted caller is trusted as-is (and a collision on it
  // surfaces normally, below). One the dashboard generates is retried on collision
  // instead, since there is no field left in the UI for the administrator to fix.
  const slugIsGenerated = input.slug === undefined
  let slug = input.slug ?? await generateUniqueProfileSlug(event, client, input.nameEn)

  const buildValues = (slugValue: string): TablesInsert<'profiles'> => ({
    organization_id: input.organizationId,
    slug: slugValue,
    profile_type: input.profileType,
    status: input.status,
    name_en: input.nameEn,
    name_ar: input.nameAr,
    job_title_en: input.jobTitleEn,
    job_title_ar: input.jobTitleAr,
    department_en: input.departmentEn,
    department_ar: input.departmentAr,
    headline_en: input.headlineEn,
    headline_ar: input.headlineAr,
    bio_en: input.bioEn,
    bio_ar: input.bioAr,
    location_en: input.locationEn,
    location_ar: input.locationAr,
    email: input.email,
    phone: input.phone,
    whatsapp: input.whatsapp,
    linkedin_url: input.linkedinUrl,
    website_url: input.websiteUrl,
    booking_url: input.bookingUrl,
    photo_path: input.photoPath,
    created_by: session.userId,
    updated_by: session.userId,
    // published_at is owned by a database trigger, never set from here.
  })

  const maxInsertAttempts = slugIsGenerated ? 3 : 1

  for (let attempt = 1; attempt <= maxInsertAttempts; attempt++) {
    try {
      const row = await profilesRepository.insertProfile(client, buildValues(slug))
      const links = await profilesRepository.replaceProfileLinks(
        client,
        row.id,
        input.links.map(toLinkInsert),
      )
      const sections = await profilesRepository.replaceProfileSections(
        client,
        row.id,
        input.sections.map(toSectionInsert),
      )

      return toProfile(row, links, sections)
    }
    catch (error) {
      const isLastAttempt = attempt === maxInsertAttempts
      if (slugIsGenerated && isSlugCollisionError(error) && !isLastAttempt) {
        slug = await generateUniqueProfileSlug(event, client, input.nameEn)
        continue
      }
      throw fromPostgrestError(error, event)
    }
  }

  // Unreachable: the loop above always returns or throws.
  throw fromPostgrestError(new Error('unreachable'), event)
}

export async function updateProfileForAdmin(
  event: H3Event,
  session: AdminSession,
  id: string,
  input: ProfileUpdateInput,
): Promise<Profile> {
  // Load first so tenancy is verified against the stored row, not the payload.
  await getProfileForAdmin(event, session, id)

  const client = serverSupabaseServiceRole(event)

  const values: Record<string, unknown> = { updated_by: session.userId }

  const assign = (column: string, value: unknown) => {
    if (value !== undefined) values[column] = value
  }

  assign('slug', input.slug)
  assign('profile_type', input.profileType)
  assign('status', input.status)
  assign('name_en', input.nameEn)
  assign('name_ar', input.nameAr)
  assign('job_title_en', input.jobTitleEn)
  assign('job_title_ar', input.jobTitleAr)
  assign('department_en', input.departmentEn)
  assign('department_ar', input.departmentAr)
  assign('headline_en', input.headlineEn)
  assign('headline_ar', input.headlineAr)
  assign('bio_en', input.bioEn)
  assign('bio_ar', input.bioAr)
  assign('location_en', input.locationEn)
  assign('location_ar', input.locationAr)
  assign('email', input.email)
  assign('phone', input.phone)
  assign('whatsapp', input.whatsapp)
  assign('linkedin_url', input.linkedinUrl)
  assign('website_url', input.websiteUrl)
  assign('booking_url', input.bookingUrl)
  assign('photo_path', input.photoPath)

  try {
    const row = await profilesRepository.updateProfile(client, id, values)
    if (!row) throw notFound(event)

    // An absent key means "leave alone", not "clear" — the dashboard PATCHes one
    // panel at a time, and a status toggle must not wipe a profile's content.
    const links = input.links
      ? await profilesRepository.replaceProfileLinks(client, id, input.links.map(toLinkInsert))
      : await profilesRepository.listProfileLinks(client, id)

    const sections = input.sections
      ? await profilesRepository.replaceProfileSections(client, id, input.sections.map(toSectionInsert))
      : await profilesRepository.listProfileSections(client, id)

    return toProfile(row, links, sections)
  }
  catch (error) {
    throw fromPostgrestError(error, event)
  }
}

export async function setProfileStatus(
  event: H3Event,
  session: AdminSession,
  id: string,
  status: ProfileRow['status'],
): Promise<Profile> {
  return updateProfileForAdmin(event, session, id, { status })
}

export async function deleteProfileForAdmin(
  event: H3Event,
  session: AdminSession,
  id: string,
): Promise<void> {
  const existing = await getProfileForAdmin(event, session, id)

  if (existing.profileType === 'company') {
    // Deleting the company profile would break the card embedded in every
    // individual profile. Deactivating is the reversible equivalent.
    throw apiError({
      code: 'conflict',
      messageKey: 'errors.conflict',
      event,
      internal: { reason: 'company_profile_delete_blocked', profileId: id },
    })
  }

  const client = serverSupabaseServiceRole(event)

  try {
    await profilesRepository.deleteProfile(client, id)
  }
  catch (error) {
    throw fromPostgrestError(error, event)
  }
}

/** Counts for the dashboard overview. */
export async function getProfileCounts(event: H3Event, session: AdminSession) {
  const client = serverSupabaseServiceRole(event)

  try {
    const [published, draft, inactive] = await Promise.all([
      profilesRepository.countProfilesByStatus(client, session.organizationId, 'published'),
      profilesRepository.countProfilesByStatus(client, session.organizationId, 'draft'),
      profilesRepository.countProfilesByStatus(client, session.organizationId, 'inactive'),
    ])

    return { published, draft, inactive, total: published + draft + inactive }
  }
  catch (error) {
    throw fromPostgrestError(error, event)
  }
}

/** Canonical public URL of a profile, for the dashboard's "view public" link. */
export function publicUrlFor(slug: string, locale: LocaleCode): string {
  return profileUrl(locale, slug)
}
