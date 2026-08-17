import { profileIdParamSchema, profileStatusUpdateSchema } from '#shared/schemas/profile.schema'
import { setProfileStatus } from '../../../../services/profile.service'
import { requireCapability } from '../../../../utils/auth'
import { validatedBody, validatedParams } from '../../../../utils/validation'

/**
 * PATCH /api/admin/profiles/:id/status
 *
 * Publish / unpublish. Separate from the general update route because it is a distinct
 * action with a distinct permission (`profiles:publish`) and a distinct audit meaning —
 * it is the moment a profile becomes world-readable.
 *
 * `published_at` is not accepted here: a database trigger owns it.
 */
export default defineEventHandler(async (event) => {
  const session = await requireCapability(event, 'profiles:publish')
  const { id } = validatedParams(event, profileIdParamSchema)
  const { status } = await validatedBody(event, profileStatusUpdateSchema)

  return setProfileStatus(event, session, id, status)
})
