import { z } from 'zod'
import { PROFILE_SLUG_MAX_LENGTH, PROFILE_SLUG_MIN_LENGTH, SLUG_PATTERN, isReservedProfileSlug } from '#shared/constants/profiles'

/**
 * Building blocks reused by every schema in this folder. Defined once so client
 * and server validation can never drift apart.
 */

/** Only these protocols may ever reach an `href`. Blocks javascript:/data: XSS. */
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:'])

export const uuidSchema = z.uuid({ message: 'validation.uuid' })

/**
 * Trimmed, non-empty text with an upper bound. Bounds are not cosmetic: they
 * cap the size of anything rendered into a vCard, QR payload or wallet pass.
 */
export function requiredText(max: number, min = 1) {
  return z.string().trim().min(min, { message: 'validation.required' }).max(max, { message: 'validation.tooLong' })
}

/**
 * Optional free text. Empty strings coming from HTML inputs collapse to `null`
 * so the database stores an absence rather than an empty string.
 */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, { message: 'validation.tooLong' })
    .transform(value => (value.length === 0 ? null : value))
    .nullish()
    .transform(value => value ?? null)
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'validation.email' }))

export const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform(value => (value.length === 0 ? null : value))
  .nullish()
  .transform(value => value ?? null)
  .refine(value => value === null || z.email().safeParse(value).success, { message: 'validation.email' })

/**
 * Phone numbers are stored in E.164 (`+966501234567`) because that is the only
 * form that works unambiguously in a vCard, a `tel:` link and a WhatsApp link.
 */
export const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/

export const optionalPhoneSchema = z
  .string()
  .trim()
  .transform(value => value.replace(/[\s()\-.]/g, ''))
  .transform(value => (value.length === 0 ? null : value))
  .nullish()
  .transform(value => value ?? null)
  .refine(value => value === null || PHONE_PATTERN.test(value), { message: 'validation.phone' })

function isSafeUrl(value: string): boolean {
  try {
    return SAFE_URL_PROTOCOLS.has(new URL(value).protocol)
  }
  catch {
    return false
  }
}

export const safeUrlSchema = z
  .string()
  .trim()
  .max(2048, { message: 'validation.tooLong' })
  .refine(isSafeUrl, { message: 'validation.url' })

export const optionalSafeUrlSchema = z
  .string()
  .trim()
  .max(2048, { message: 'validation.tooLong' })
  .transform(value => (value.length === 0 ? null : value))
  .nullish()
  .transform(value => value ?? null)
  .refine(value => value === null || isSafeUrl(value), { message: 'validation.url' })

/**
 * Public profile slug. Lowercase kebab-case only, and never one of the reserved
 * application paths — a profile called `admin` would shadow the dashboard.
 */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(PROFILE_SLUG_MIN_LENGTH, { message: 'validation.required' })
  .max(PROFILE_SLUG_MAX_LENGTH, { message: 'validation.tooLong' })
  .regex(SLUG_PATTERN, { message: 'validation.slug' })
  .refine(value => !isReservedProfileSlug(value), { message: 'validation.slugReserved' })

/**
 * Storage object key. Relative, no traversal, no leading slash — the bucket is
 * chosen by the server, never by the client.
 */
export const optionalStoragePathSchema = z
  .string()
  .trim()
  .max(512, { message: 'validation.tooLong' })
  .transform(value => (value.length === 0 ? null : value))
  .nullish()
  .transform(value => value ?? null)
  .refine(
    value => value === null || (!value.includes('..') && !value.startsWith('/')),
    { message: 'validation.storagePath' },
  )

/** Hex colour, used by the branding settings. */
export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'validation.color' })

export const optionalHexColorSchema = z
  .string()
  .trim()
  .transform(value => (value.length === 0 ? null : value))
  .nullish()
  .transform(value => value ?? null)
  .refine(
    value => value === null || /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value),
    { message: 'validation.color' },
  )

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
})

export type Pagination = z.infer<typeof paginationSchema>
