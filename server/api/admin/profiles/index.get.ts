import { profileListQuerySchema } from '#shared/schemas/profile.schema'
import { listProfilesForAdmin } from '../../../services/profile.service'
import { requireCapability } from '../../../utils/auth'
import { validatedQuery } from '../../../utils/validation'

/**
 * GET /api/admin/profiles?page=1&perPage=20&search=&status=&profileType=
 *
 * Paginated listing, scoped to the caller's organization by the service layer — the
 * organization is taken from the server-resolved session, never from the query string.
 */
export default defineEventHandler(async (event) => {
  const session = await requireCapability(event, 'profiles:read')
  const query = validatedQuery(event, profileListQuerySchema)

  setHeader(event, 'cache-control', 'no-store')

  return listProfilesForAdmin(event, session, query)
})
