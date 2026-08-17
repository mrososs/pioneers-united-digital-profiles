import { profileIdParamSchema } from '#shared/schemas/profile.schema'
import { getProfileForAdmin } from '../../../services/profile.service'
import { requireCapability } from '../../../utils/auth'
import { validatedParams } from '../../../utils/validation'

/** GET /api/admin/profiles/:id — full record for the detail and edit screens. */
export default defineEventHandler(async (event) => {
  const session = await requireCapability(event, 'profiles:read')
  const { id } = validatedParams(event, profileIdParamSchema)

  setHeader(event, 'cache-control', 'no-store')

  return getProfileForAdmin(event, session, id)
})
