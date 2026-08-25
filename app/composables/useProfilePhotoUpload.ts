import { STORAGE_BUCKETS, isAllowedMimeType, isWithinSizeLimit } from '#shared/constants/storage'
import type { Profile } from '#shared/types/profile'

/**
 * Validates and uploads a profile photograph, then PATCHes `photoPath` onto the
 * profile row.
 *
 * Shared by two callers that upload at different moments: `AdminProfileForm`'s
 * edit-mode control (uploads the instant a file is chosen, against a profile
 * that already exists) and the create page (uploads right after the new
 * profile row is inserted, once an id exists to derive the object key from).
 * Keeping the validate → upload → PATCH sequence here means both stay in sync
 * with `shared/constants/storage.ts` without duplicating the checks.
 */
export function useProfilePhotoUpload() {
  const { upload } = useMediaUpload()

  /** Mimics `ApiErrorPayload` so `useApiError` renders it exactly like a server rejection. */
  function clientValidationError(messageKey: string) {
    return { data: { code: 'validation_error', messageKey } }
  }

  async function uploadProfilePhoto(profileId: string, file: File): Promise<string> {
    if (!isAllowedMimeType(STORAGE_BUCKETS.profileMedia, file.type)) {
      throw clientValidationError('validation.fileType')
    }
    if (!isWithinSizeLimit(STORAGE_BUCKETS.profileMedia, file.size)) {
      throw clientValidationError('validation.fileTooLarge')
    }

    const uploaded = await upload(file, 'profile-photo', profileId)
    await $fetch<Profile>(`/api/admin/profiles/${profileId}`, { method: 'PATCH', body: { photoPath: uploaded.path } })

    return uploaded.url
  }

  return { uploadProfilePhoto }
}
