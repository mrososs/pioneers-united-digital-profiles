import { brandingUpdateSchema } from '#shared/schemas/settings.schema'
import { updateBranding } from '../../services/organization.service'
import { requireCapability } from '../../utils/auth'
import { validatedBody } from '../../utils/validation'

/**
 * PATCH /api/admin/branding
 *
 * Only colours (validated hex) and storage object keys are storable — never raw CSS or
 * arbitrary strings, because these values are interpolated into CSS custom properties
 * on the public profile.
 */
export default defineEventHandler(async (event) => {
  const session = await requireCapability(event, 'branding:write')
  const input = await validatedBody(event, brandingUpdateSchema)

  return updateBranding(event, session, input)
})
