import { profileIdParamSchema } from '#shared/schemas/profile.schema'
import { deleteProfileForAdmin } from '../../../services/profile.service'
import { requireCapability } from '../../../utils/auth'
import { validatedParams } from '../../../utils/validation'

/**
 * DELETE /api/admin/profiles/:id
 *
 * Requires `profiles:delete`, which only super_admin carries: deleting a profile
 * permanently breaks a link that may already be printed on a business card. The
 * service layer refuses to delete the company profile at all.
 */
export default defineEventHandler(async (event) => {
  const session = await requireCapability(event, 'profiles:delete')
  const { id } = validatedParams(event, profileIdParamSchema)

  await deleteProfileForAdmin(event, session, id)

  setResponseStatus(event, 204)

  return null
})
