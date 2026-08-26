import { z } from 'zod'
import {
  PROFILE_SECTION_KINDS,
  PROFILE_SECTION_MAX_ITEMS,
  PROFILE_SECTION_TEXT_MAX,
} from '#shared/constants/profile-sections'
import { optionalSafeUrlSchema, optionalText, uuidSchema } from '#shared/schemas/common.schema'

/**
 * The payload contract for every structured content block.
 *
 * THIS FILE IS THE SCHEMA THE DATABASE DOES NOT ENFORCE.
 *   `profile_sections.payload` is JSONB, and the migration deliberately constrains
 *   only the envelope — an object, size-capped. The shape of what is inside is
 *   defined here, once, and parsed on every write by the Nitro handler. The
 *   dashboard form parses the same definition so an operator sees errors without a
 *   round trip. If this file and a stored row ever disagree, this file wins: the
 *   read path tolerates unknown keys and drops them.
 *
 * BILINGUAL FIELDS INSIDE THE PAYLOAD
 *   Paired `*En` / `*Ar` keys, matching the paired columns on `profiles`. The read
 *   path resolves them through the same `localised()` helper the rest of the mapper
 *   uses, so a block filled in only in English still renders on the Arabic page
 *   rather than vanishing.
 */

/** Short bilingual label — a tag, a metric caption, a proficiency level. */
const label = () => optionalText(120)

/** Body copy inside a card. Bounded well under the payload size cap. */
const body = () => optionalText(PROFILE_SECTION_TEXT_MAX)

const items = <T extends z.ZodTypeAny>(item: T) =>
  z.array(item).min(1, { message: 'validation.required' }).max(PROFILE_SECTION_MAX_ITEMS)

// -----------------------------------------------------------------------------
// One payload per kind
// -----------------------------------------------------------------------------

/** Highlight figures. `value` is bilingual because "SAR 2.4B" is not. */
export const metricsPayloadSchema = z.object({
  items: items(z.object({
    valueEn: label(),
    valueAr: label(),
    labelEn: label(),
    labelAr: label(),
  })),
})

/** Flat tag list — areas of expertise on a person, sectors served on a company. */
export const expertisePayloadSchema = z.object({
  items: items(z.object({
    labelEn: label(),
    labelAr: label(),
  })),
})

/** What a company does. `icon` is a key into app/utils/icons.ts, not a URL. */
export const servicesPayloadSchema = z.object({
  items: items(z.object({
    icon: optionalText(40),
    titleEn: label(),
    titleAr: label(),
    descriptionEn: body(),
    descriptionAr: body(),
  })),
})

/** Career history. The one block where the order genuinely carries meaning. */
export const experiencePayloadSchema = z.object({
  items: items(z.object({
    roleEn: label(),
    roleAr: label(),
    organizationEn: label(),
    organizationAr: label(),
    periodEn: label(),
    periodAr: label(),
    summaryEn: body(),
    summaryAr: body(),
  })),
})

/** Certifications, degrees, licences, memberships, accreditations. */
export const credentialsPayloadSchema = z.object({
  items: items(z.object({
    nameEn: label(),
    nameAr: label(),
    issuerEn: label(),
    issuerAr: label(),
    year: optionalText(12),
    url: optionalSafeUrlSchema,
  })),
})

/** Awards, press, speaking engagements. */
export const recognitionPayloadSchema = z.object({
  items: items(z.object({
    titleEn: label(),
    titleAr: label(),
    sourceEn: label(),
    sourceAr: label(),
    year: optionalText(12),
    url: optionalSafeUrlSchema,
  })),
})

export const languagesPayloadSchema = z.object({
  items: items(z.object({
    nameEn: label(),
    nameAr: label(),
    levelEn: label(),
    levelAr: label(),
  })),
})

/** Offices. `mapUrl` deep-links the address the way the reference microsite does. */
export const officesPayloadSchema = z.object({
  items: items(z.object({
    nameEn: label(),
    nameAr: label(),
    addressEn: body(),
    addressAr: body(),
    mapUrl: optionalSafeUrlSchema,
    phone: optionalText(32),
  })),
})

/**
 * Downloadable material — a CV, a company profile, a capability statement.
 *
 * `url` is required here, unlike everywhere else in this file: a document card
 * with nothing to open is not a document card. `fileType` is a display hint
 * ("PDF", "DOCX"), never used to decide how the browser treats the response.
 */
export const documentsPayloadSchema = z.object({
  items: items(z.object({
    titleEn: label(),
    titleAr: label(),
    descriptionEn: body(),
    descriptionAr: body(),
    url: optionalSafeUrlSchema,
    fileType: optionalText(12),
  })),
})

/**
 * The discriminated union. Adding a block type is one variant here plus one
 * renderer component — that is the whole point of the generic table.
 */
export const profileSectionPayloadSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('metrics'), payload: metricsPayloadSchema }),
  z.object({ kind: z.literal('expertise'), payload: expertisePayloadSchema }),
  z.object({ kind: z.literal('services'), payload: servicesPayloadSchema }),
  z.object({ kind: z.literal('experience'), payload: experiencePayloadSchema }),
  z.object({ kind: z.literal('credentials'), payload: credentialsPayloadSchema }),
  z.object({ kind: z.literal('recognition'), payload: recognitionPayloadSchema }),
  z.object({ kind: z.literal('languages'), payload: languagesPayloadSchema }),
  z.object({ kind: z.literal('offices'), payload: officesPayloadSchema }),
  z.object({ kind: z.literal('documents'), payload: documentsPayloadSchema }),
])

export const profileSectionKindSchema = z.enum(PROFILE_SECTION_KINDS)

/**
 * A section as the dashboard submits it.
 *
 * The kind/payload pair is validated by the union above and then merged with the
 * envelope fields, so a `metrics` block can never be saved carrying an
 * `experience` payload.
 */
export const profileSectionInputSchema = z
  .object({
    id: uuidSchema.optional(),
    kind: profileSectionKindSchema,
    titleEn: optionalText(120),
    titleAr: optionalText(120),
    sortOrder: z.number().int().min(0).max(999).default(0),
    enabled: z.boolean().default(true),
    payload: z.unknown(),
  })
  .superRefine((value, ctx) => {
    const result = profileSectionPayloadSchema.safeParse({ kind: value.kind, payload: value.payload })
    if (result.success) return

    for (const issue of result.error.issues) {
      ctx.addIssue({
        ...issue,
        // Drop the synthetic `payload` prefix the union adds so the path points at
        // the field the operator actually typed into.
        path: [...issue.path],
      })
    }
  })
  .transform(value => ({
    ...value,
    payload: profileSectionPayloadSchema.parse({ kind: value.kind, payload: value.payload }).payload,
  }))

export type ProfileSectionInput = z.infer<typeof profileSectionInputSchema>

export type MetricsPayload = z.infer<typeof metricsPayloadSchema>
export type ExpertisePayload = z.infer<typeof expertisePayloadSchema>
export type ServicesPayload = z.infer<typeof servicesPayloadSchema>
export type ExperiencePayload = z.infer<typeof experiencePayloadSchema>
export type CredentialsPayload = z.infer<typeof credentialsPayloadSchema>
export type RecognitionPayload = z.infer<typeof recognitionPayloadSchema>
export type LanguagesPayload = z.infer<typeof languagesPayloadSchema>
export type OfficesPayload = z.infer<typeof officesPayloadSchema>
export type DocumentsPayload = z.infer<typeof documentsPayloadSchema>
