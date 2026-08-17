import { describe, expect, it } from 'vitest'
import {
  BUCKET_CONSTRAINTS,
  MAX_PROFILE_PHOTO_BYTES,
  STORAGE_BUCKETS,
  buildBrandAssetKey,
  buildProfilePhotoKey,
  isAllowedMimeType,
  isWithinSizeLimit,
} from '#shared/constants/storage'

/**
 * Storage keys are DERIVED, never taken from the client. These tests pin that property and
 * the MIME/size allow-lists, since the same constants drive the browser check, the Nitro
 * handler and the bucket definitions in the migration.
 */

const PROFILE_ID = '44444444-4444-4444-8444-444444444444'
const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111'
const NOW = 1_766_000_000_000

describe('object key derivation', () => {
  it('builds a profile photo key from ids and the detected MIME type', () => {
    expect(buildProfilePhotoKey(PROFILE_ID, 'image/jpeg', NOW))
      .toBe(`profiles/${PROFILE_ID}/photo-${NOW}.jpg`)

    expect(buildProfilePhotoKey(PROFILE_ID, 'image/webp', NOW))
      .toBe(`profiles/${PROFILE_ID}/photo-${NOW}.webp`)
  })

  it('builds a brand asset key per organization and kind', () => {
    expect(buildBrandAssetKey(ORGANIZATION_ID, 'logo', 'image/svg+xml', NOW))
      .toBe(`organizations/${ORGANIZATION_ID}/logo-${NOW}.svg`)

    expect(buildBrandAssetKey(ORGANIZATION_ID, 'og-image', 'image/png', NOW))
      .toBe(`organizations/${ORGANIZATION_ID}/og-image-${NOW}.png`)
  })

  it('never produces a traversal, an absolute path, or an extension from user input', () => {
    const key = buildProfilePhotoKey(PROFILE_ID, 'application/x-msdownload', NOW)

    expect(key).not.toContain('..')
    expect(key.startsWith('/')).toBe(false)
    // An unrecognised type falls back to .bin rather than trusting the caller.
    expect(key.endsWith('.bin')).toBe(true)
  })

  it('produces a distinct key per upload so a photo replacement cannot overwrite silently', () => {
    expect(buildProfilePhotoKey(PROFILE_ID, 'image/png', NOW))
      .not.toBe(buildProfilePhotoKey(PROFILE_ID, 'image/png', NOW + 1))
  })
})

describe('MIME allow-lists', () => {
  it('permits raster images in the profile bucket', () => {
    for (const mimeType of ['image/jpeg', 'image/png', 'image/webp', 'image/avif']) {
      expect(isAllowedMimeType(STORAGE_BUCKETS.profileMedia, mimeType)).toBe(true)
    }
  })

  it('refuses SVG for profile photos — it is an executable document', () => {
    expect(isAllowedMimeType(STORAGE_BUCKETS.profileMedia, 'image/svg+xml')).toBe(false)
  })

  it('permits SVG only in the brand bucket, which super admins alone may write', () => {
    expect(isAllowedMimeType(STORAGE_BUCKETS.brandAssets, 'image/svg+xml')).toBe(true)
  })

  it('refuses arbitrary file types everywhere', () => {
    for (const bucket of Object.values(STORAGE_BUCKETS)) {
      expect(isAllowedMimeType(bucket, 'text/html')).toBe(false)
      expect(isAllowedMimeType(bucket, 'application/javascript')).toBe(false)
      expect(isAllowedMimeType(bucket, 'application/x-msdownload')).toBe(false)
    }
  })
})

describe('size limits', () => {
  it('accepts a file inside the limit', () => {
    expect(isWithinSizeLimit(STORAGE_BUCKETS.profileMedia, 1024)).toBe(true)
    expect(isWithinSizeLimit(STORAGE_BUCKETS.profileMedia, MAX_PROFILE_PHOTO_BYTES)).toBe(true)
  })

  it('rejects an oversized or empty file', () => {
    expect(isWithinSizeLimit(STORAGE_BUCKETS.profileMedia, MAX_PROFILE_PHOTO_BYTES + 1)).toBe(false)
    expect(isWithinSizeLimit(STORAGE_BUCKETS.profileMedia, 0)).toBe(false)
    expect(isWithinSizeLimit(STORAGE_BUCKETS.profileMedia, -1)).toBe(false)
  })
})

describe('bucket visibility', () => {
  it('keeps generated wallet passes private', () => {
    // A pass embeds one person's contact details; it must never be world-readable.
    expect(BUCKET_CONSTRAINTS[STORAGE_BUCKETS.walletPasses].public).toBe(false)
  })

  it('keeps profile and brand media public so shared links and CDN caching work', () => {
    expect(BUCKET_CONSTRAINTS[STORAGE_BUCKETS.profileMedia].public).toBe(true)
    expect(BUCKET_CONSTRAINTS[STORAGE_BUCKETS.brandAssets].public).toBe(true)
  })
})
