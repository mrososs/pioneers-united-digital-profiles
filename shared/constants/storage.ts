/**
 * Supabase Storage strategy.
 *
 * Buckets, MIME allow-lists and size caps are declared once here and enforced
 * in three independent places:
 *
 *   1. the browser, for immediate feedback (app/composables/useMediaUpload.ts)
 *   2. the Nitro upload handler, which is the authoritative check
 *   3. the bucket definition itself, in supabase/migrations (allowed_mime_types
 *      and file_size_limit) plus storage RLS policies
 *
 * See docs/storage.md for the full rationale.
 */

export const STORAGE_BUCKETS = {
  /** Public: profile photographs. Served straight from the CDN. */
  profileMedia: 'profile-media',
  /** Public: organization logos and brand artwork. */
  brandAssets: 'brand-assets',
  /** Private: generated .pkpass bundles and wallet artwork. Signed URLs only. */
  walletPasses: 'wallet-passes',
} as const

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS]

export const PUBLIC_STORAGE_BUCKETS: readonly StorageBucket[] = [
  STORAGE_BUCKETS.profileMedia,
  STORAGE_BUCKETS.brandAssets,
]

export const PRIVATE_STORAGE_BUCKETS: readonly StorageBucket[] = [
  STORAGE_BUCKETS.walletPasses,
]

/** Raster + vector formats we are willing to serve. No SVG in user uploads. */
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const

/**
 * SVG is allowed for brand assets only, and only for super admins, because an
 * SVG is an executable document. Brand assets are uploaded by trusted staff and
 * are served from the Supabase Storage origin, not from the app origin.
 */
export const BRAND_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  'image/svg+xml',
] as const

export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024 // 5 MB
export const MAX_BRAND_ASSET_BYTES = 2 * 1024 * 1024 // 2 MB
export const MAX_WALLET_ASSET_BYTES = 1 * 1024 * 1024 // 1 MB

export const BUCKET_CONSTRAINTS = {
  [STORAGE_BUCKETS.profileMedia]: {
    public: true,
    maxBytes: MAX_PROFILE_PHOTO_BYTES,
    mimeTypes: IMAGE_MIME_TYPES as readonly string[],
  },
  [STORAGE_BUCKETS.brandAssets]: {
    public: true,
    maxBytes: MAX_BRAND_ASSET_BYTES,
    mimeTypes: BRAND_MIME_TYPES as readonly string[],
  },
  [STORAGE_BUCKETS.walletPasses]: {
    public: false,
    maxBytes: MAX_WALLET_ASSET_BYTES,
    mimeTypes: ['application/vnd.apple.pkpass', 'image/png'] as readonly string[],
  },
} as const satisfies Record<StorageBucket, {
  public: boolean
  maxBytes: number
  mimeTypes: readonly string[]
}>

/** Extension for a permitted MIME type; used to build deterministic object keys. */
export const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'application/vnd.apple.pkpass': 'pkpass',
}

/**
 * Object keys are always derived, never taken from the client file name — that
 * is how path traversal and content-type confusion get in.
 *
 *   profile-media/profiles/<profileId>/photo-<epochMs>.<ext>
 *   brand-assets/organizations/<organizationId>/logo-<epochMs>.<ext>
 */
export function buildProfilePhotoKey(profileId: string, mimeType: string, now: number): string {
  const extension = MIME_EXTENSION[mimeType] ?? 'bin'
  return `profiles/${profileId}/photo-${now}.${extension}`
}

export function buildBrandAssetKey(organizationId: string, kind: 'logo' | 'logo-dark' | 'favicon' | 'og-image', mimeType: string, now: number): string {
  const extension = MIME_EXTENSION[mimeType] ?? 'bin'
  return `organizations/${organizationId}/${kind}-${now}.${extension}`
}

export function isAllowedMimeType(bucket: StorageBucket, mimeType: string): boolean {
  return BUCKET_CONSTRAINTS[bucket].mimeTypes.includes(mimeType)
}

export function isWithinSizeLimit(bucket: StorageBucket, bytes: number): boolean {
  return bytes > 0 && bytes <= BUCKET_CONSTRAINTS[bucket].maxBytes
}
