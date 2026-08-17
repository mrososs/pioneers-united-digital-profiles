import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import {
  BUCKET_CONSTRAINTS,
  MIME_EXTENSION,
  STORAGE_BUCKETS,
  buildBrandAssetKey,
  buildProfilePhotoKey,
  isAllowedMimeType,
  isWithinSizeLimit,
} from '#shared/constants/storage'
import { uuidSchema } from '#shared/schemas/common.schema'
import { requireAdmin, requireCapability } from '../../../utils/auth'
import { apiError } from '../../../utils/errors'
import { requestLogger } from '../../../utils/logger'
import { publicStorageUrl } from '../../../utils/urls'

/**
 * POST /api/admin/media/upload   (multipart/form-data)
 *
 * The single upload path for profile photographs and brand assets.
 *
 * WHY UPLOADS GO THROUGH NITRO RATHER THAN THE BROWSER TALKING TO STORAGE
 *   The browser could upload directly with the anon key and storage RLS would still
 *   apply. Routing through the server buys three things RLS cannot express:
 *
 *     1. The object key is DERIVED here, never supplied by the client. A
 *        client-controlled key is how you get path traversal, overwrites of another
 *        profile's photo, and files planted at attacker-chosen paths.
 *     2. The declared MIME type is checked against the magic bytes of the payload.
 *        A `.svg` renamed to `.png` with `Content-Type: image/png` passes a header
 *        check and then executes when served; the signature check catches it.
 *     3. The size limit is enforced before anything is written.
 *
 *   Supabase also enforces `allowed_mime_types` and `file_size_limit` at the bucket
 *   level (see the storage migration), so these checks are the first of two layers,
 *   not the only one.
 */

const KINDS = ['profile-photo', 'logo', 'logo-dark', 'favicon', 'og-image'] as const
type UploadKind = typeof KINDS[number]

const fieldsSchema = z.object({
  kind: z.enum(KINDS),
  /** Required for profile-photo: the profile the object belongs to. */
  profileId: uuidSchema.optional(),
})

/**
 * Magic-byte signatures for the formats we accept. Checking the payload rather than
 * trusting the declared type is the part that actually prevents content-type
 * confusion.
 */
const SIGNATURES: { mimeType: string, matches: (bytes: Uint8Array) => boolean }[] = [
  {
    mimeType: 'image/jpeg',
    matches: bytes => bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF,
  },
  {
    mimeType: 'image/png',
    matches: bytes =>
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
      && bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A,
  },
  {
    mimeType: 'image/webp',
    matches: bytes =>
      // 'RIFF' .... 'WEBP'
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50,
  },
  {
    mimeType: 'image/avif',
    matches: bytes =>
      // ISO-BMFF: 'ftyp' at offset 4, brand 'avif'/'avis' at offset 8
      bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
      && bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69
      && (bytes[11] === 0x66 || bytes[11] === 0x73),
  },
  {
    mimeType: 'image/svg+xml',
    matches: (bytes) => {
      // SVG has no binary magic. Require the document to actually begin with XML or an
      // <svg element, after optional whitespace and a BOM.
      const head = new TextDecoder('utf-8', { fatal: false })
        .decode(bytes.subarray(0, 512))
        // Strip a UTF-8 BOM before inspecting the first token. Written as an escape,
        // not a literal, so the character is visible in review.
        .replace(/^\uFEFF/, '')
        .trimStart()
        .toLowerCase()

      return head.startsWith('<?xml') || head.startsWith('<svg') || head.startsWith('<!doctype svg')
    },
  },
]

function detectedMimeType(bytes: Uint8Array): string | null {
  return SIGNATURES.find(signature => signature.matches(bytes))?.mimeType ?? null
}

function bucketFor(kind: UploadKind) {
  return kind === 'profile-photo' ? STORAGE_BUCKETS.profileMedia : STORAGE_BUCKETS.brandAssets
}

export default defineEventHandler(async (event) => {
  // Brand assets accept SVG, so writing one requires the higher permission.
  const session = await requireAdmin(event)

  const form = await readMultipartFormData(event)

  if (!form || form.length === 0) {
    throw apiError({ code: 'validation_error', event, internal: { reason: 'empty_multipart_body' } })
  }

  const fileEntry = form.find(part => part.name === 'file' && part.filename !== undefined)
  const textFields: Record<string, string> = {}

  for (const part of form) {
    if (part.name && part.filename === undefined) {
      textFields[part.name] = part.data.toString('utf8')
    }
  }

  const fields = fieldsSchema.safeParse(textFields)

  if (!fields.success) {
    throw apiError({
      code: 'validation_error',
      event,
      fieldErrors: { kind: ['validation.required'] },
      internal: { issues: fields.error.issues },
    })
  }

  if (!fileEntry) {
    throw apiError({
      code: 'validation_error',
      event,
      fieldErrors: { file: ['validation.required'] },
    })
  }

  const { kind, profileId } = fields.data

  if (kind !== 'profile-photo') {
    await requireCapability(event, 'branding:write')
  }

  if (kind === 'profile-photo' && !profileId) {
    throw apiError({
      code: 'validation_error',
      event,
      fieldErrors: { profileId: ['validation.required'] },
    })
  }

  const bucket = bucketFor(kind)
  const bytes = new Uint8Array(fileEntry.data)

  if (!isWithinSizeLimit(bucket, bytes.byteLength)) {
    throw apiError({
      code: 'validation_error',
      event,
      fieldErrors: { file: ['validation.fileTooLarge'] },
      internal: { bytes: bytes.byteLength, limit: BUCKET_CONSTRAINTS[bucket].maxBytes },
    })
  }

  // The declared type is a hint; the payload is the authority.
  const actualMimeType = detectedMimeType(bytes)

  if (!actualMimeType || !isAllowedMimeType(bucket, actualMimeType)) {
    throw apiError({
      code: 'validation_error',
      event,
      fieldErrors: { file: ['validation.fileType'] },
      internal: {
        declared: fileEntry.type ?? null,
        detected: actualMimeType,
        bucket,
      },
    })
  }

  const now = Date.now()
  const objectKey = kind === 'profile-photo'
    // profileId is present here: checked above.
    ? buildProfilePhotoKey(profileId as string, actualMimeType, now)
    : buildBrandAssetKey(session.organizationId, kind, actualMimeType, now)

  const client = serverSupabaseServiceRole(event)

  const { error } = await client.storage.from(bucket).upload(objectKey, bytes, {
    contentType: actualMimeType,
    // Keys are unique per upload, so an overwrite would mean a collision, not an
    // intentional replacement.
    upsert: false,
    cacheControl: '31536000',
  })

  if (error) {
    requestLogger(event).error('storage_upload_failed', { bucket, kind, detail: error })
    throw apiError({ code: 'internal_error', event })
  }

  return {
    bucket,
    path: objectKey,
    url: publicStorageUrl(bucket, objectKey),
    mimeType: actualMimeType,
    extension: MIME_EXTENSION[actualMimeType] ?? 'bin',
    bytes: bytes.byteLength,
  }
})
