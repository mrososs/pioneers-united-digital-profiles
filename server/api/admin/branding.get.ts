import { getBranding } from '../../services/organization.service'
import { requireCapability } from '../../utils/auth'

/** GET /api/admin/branding — brand colours and asset paths. */
export default defineEventHandler(async (event) => {
  const session = await requireCapability(event, 'branding:read')

  setHeader(event, 'cache-control', 'no-store')

  return getBranding(event, session.organizationId)
})
