import { pdfBrandingUpdateSchema } from '#shared/schemas/settings.schema'
import { updatePdfBranding } from '../../../services/organization.service'
import { requireCapability } from '../../../utils/auth'
import { validatedBody } from '../../../utils/validation'

/**
 * PATCH /api/admin/branding/pdf
 *
 * Only colours (validated hex) are storable — never raw CSS — because these values are
 * interpolated into CSS custom properties on the profile's print view.
 */
export default defineEventHandler(async (event) => {
  const session = await requireCapability(event, 'branding:write')
  const input = await validatedBody(event, pdfBrandingUpdateSchema)

  return updatePdfBranding(event, session, input)
})
