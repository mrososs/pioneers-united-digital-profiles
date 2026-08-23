/**
 * Client for the one Storage write path, `/api/admin/media/upload`. See
 * shared/constants/storage.ts for the bucket/size/MIME rules this mirrors.
 *
 * Thin on purpose: it throws like any other `$fetch` call, so callers compose it
 * with `useAsyncAction` and get the usual translated error handling for free
 * rather than a second, parallel error shape.
 */

export interface MediaUploadResult {
  bucket: string
  path: string
  url: string
  mimeType: string
  extension: string
  bytes: number
}

export type MediaUploadKind = 'profile-photo' | 'logo' | 'logo-dark' | 'favicon' | 'og-image'

export function useMediaUpload() {
  function upload(file: File, kind: MediaUploadKind, profileId?: string) {
    const body = new FormData()
    body.append('file', file)
    body.append('kind', kind)
    if (profileId) body.append('profileId', profileId)

    return $fetch<MediaUploadResult>('/api/admin/media/upload', {
      method: 'POST',
      body,
    })
  }

  return { upload }
}
