import { getOrganizationForAdmin } from '../../services/organization.service'
import { requireAdmin } from '../../utils/auth'

/** GET /api/admin/organization — company details for the settings screen. */
export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)

  setHeader(event, 'cache-control', 'no-store')

  return getOrganizationForAdmin(event, session)
})
