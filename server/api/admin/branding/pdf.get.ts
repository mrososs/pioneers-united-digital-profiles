import { getPdfBranding } from '../../../services/organization.service'
import { requireCapability } from '../../../utils/auth'

/** GET /api/admin/branding/pdf — colours applied to the exported profile PDF. */
export default defineEventHandler(async (event) => {
  const session = await requireCapability(event, 'branding:read')

  setHeader(event, 'cache-control', 'no-store')

  return getPdfBranding(event, session.organizationId)
})
