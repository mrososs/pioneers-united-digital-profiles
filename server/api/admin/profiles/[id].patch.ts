import { profileIdParamSchema, profileUpdateSchema } from '#shared/schemas/profile.schema'
import { updateProfileForAdmin } from '../../../services/profile.service'
import { requireCapability } from '../../../utils/auth'
import { validatedBody, validatedParams } from '../../../utils/validation'

/**
 * PATCH /api/admin/profiles/:id
 *
 * Partial update. `organizationId` is absent from the update schema by construction,
 * so a profile cannot be moved between organizations through this route; the service
 * layer additionally verifies tenancy against the stored row before writing.
 */
export default defineEventHandler(async (event) => {
  const session = await requireCapability(event, 'profiles:write')
  const { id } = validatedParams(event, profileIdParamSchema)
  const input = await validatedBody(event, profileUpdateSchema)

  return updateProfileForAdmin(event, session, id, input)
})
