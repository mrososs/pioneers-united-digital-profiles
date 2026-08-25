import { z } from 'zod'
import { PROFILE_LINK_TYPES, PROFILE_STATUSES, PROFILE_TYPES } from '#shared/constants/profiles'
import {
  optionalEmailSchema,
  optionalPhoneSchema,
  optionalSafeUrlSchema,
  optionalStoragePathSchema,
  optionalText,
  paginationSchema,
  requiredText,
  slugSchema,
  uuidSchema,
} from '#shared/schemas/common.schema'

/**
 * Profile validation. The same schemas run in the dashboard forms and inside the
 * Nitro handlers — the server parse is the authoritative one; the client parse
 * exists purely so the user sees errors without a round trip.
 */

export const profileTypeSchema = z.enum(PROFILE_TYPES)
export const profileStatusSchema = z.enum(PROFILE_STATUSES)
export const profileLinkTypeSchema = z.enum(PROFILE_LINK_TYPES)

/** A single extra link rendered on the public profile. */
export const profileLinkInputSchema = z.object({
  id: uuidSchema.optional(),
  type: profileLinkTypeSchema,
  labelEn: optionalText(80),
  labelAr: optionalText(80),
  url: z.string().trim().min(1, { message: 'validation.required' }).max(2048).refine(
    (value) => {
      // Links may be an absolute http(s) URL, or a tel:/mailto: action.
      if (value.startsWith('tel:') || value.startsWith('mailto:')) return value.length > 8
      try {
        const { protocol } = new URL(value)
        return protocol === 'http:' || protocol === 'https:'
      }
      catch {
        return false
      }
    },
    { message: 'validation.url' },
  ),
  sortOrder: z.number().int().min(0).max(999).default(0),
  enabled: z.boolean().default(true),
})

export type ProfileLinkInput = z.infer<typeof profileLinkInputSchema>

/**
 * Fields an administrator can write. `published_at`, `created_by` and
 * `updated_by` are set by the server, never accepted from the client.
 *
 * NOTE: no `.default()` here, deliberately. Defaults survive `.partial()`, so a shared
 * definition carrying them would make an empty PATCH body materialise
 * `{ status: 'draft', profileType: 'individual' }` — silently unpublishing a live profile.
 * Defaults belong to the create schema only, where "absent" really does mean "use the
 * default"; in an update, "absent" means "leave alone".
 */
const profileWritableFields = {
  organizationId: uuidSchema,
  slug: slugSchema,

  profileType: profileTypeSchema,
  status: profileStatusSchema,

  nameEn: requiredText(120),
  nameAr: requiredText(120),

  jobTitleEn: optionalText(160),
  jobTitleAr: optionalText(160),

  departmentEn: optionalText(160),
  departmentAr: optionalText(160),

  bioEn: optionalText(2000),
  bioAr: optionalText(2000),

  email: optionalEmailSchema,
  phone: optionalPhoneSchema,
  whatsapp: optionalPhoneSchema,

  linkedinUrl: optionalSafeUrlSchema,
  websiteUrl: optionalSafeUrlSchema,

  locationEn: optionalText(200),
  locationAr: optionalText(200),

  photoPath: optionalStoragePathSchema,
}

export const profileCreateSchema = z.object({
  ...profileWritableFields,
  // The dashboard no longer collects a slug — the server derives one from
  // `nameEn` plus a random suffix (see createProfile in profile.service.ts) and
  // guarantees it is unique before the row is written. Left optional, rather
  // than removed, so a scripted caller may still request a specific slug.
  slug: slugSchema.optional(),
  // Defaults apply on create only — see the note above.
  profileType: profileTypeSchema.default('individual'),
  status: profileStatusSchema.default('draft'),
  links: z.array(profileLinkInputSchema).max(20).default([]),
})

/**
 * Updates are a partial of the create shape so the dashboard can PATCH a single
 * field. `organizationId` is intentionally not updatable: moving a profile
 * between organizations is a migration, not an edit.
 */
export const profileUpdateSchema = z
  .object({
    ...profileWritableFields,
    links: z.array(profileLinkInputSchema).max(20),
  })
  .omit({ organizationId: true })
  .partial()
  .refine(value => Object.keys(value).length > 0, { message: 'validation.emptyUpdate' })

export const profileStatusUpdateSchema = z.object({
  status: profileStatusSchema,
})

export const profileListQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  status: profileStatusSchema.optional(),
  profileType: profileTypeSchema.optional(),
})

export const profileSlugParamSchema = z.object({
  slug: slugSchema,
})

export const profileIdParamSchema = z.object({
  id: uuidSchema,
})

export type ProfileCreateInput = z.infer<typeof profileCreateSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type ProfileListQuery = z.infer<typeof profileListQuerySchema>
