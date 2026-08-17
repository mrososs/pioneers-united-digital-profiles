import { organizationUpdateSchema } from '#shared/schemas/organization.schema'
import { updateOrganizationForAdmin } from '../../services/organization.service'
import { requireCapability } from '../../utils/auth'
import { validatedBody } from '../../utils/validation'

/**
 * PATCH /api/admin/organization
 *
 * Requires `organization:write` (super_admin only): these values appear on the public
 * company profile and inside every vCard the platform issues.
 */
export default defineEventHandler(async (event) => {
  const session = await requireCapability(event, 'organization:write')
  const input = await validatedBody(event, organizationUpdateSchema)

  return updateOrganizationForAdmin(event, session, input)
})
