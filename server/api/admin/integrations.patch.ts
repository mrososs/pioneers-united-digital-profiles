import { integrationSettingsUpdateSchema } from '#shared/schemas/settings.schema'
import { updateIntegrations } from '../../services/organization.service'
import { requireCapability } from '../../utils/auth'
import { validatedBody } from '../../utils/validation'

/**
 * PATCH /api/admin/integrations
 *
 * Stores non-secret provider configuration. The schema rejects any config key whose
 * name looks like a credential, and a database trigger rejects it again — credentials
 * belong in the server environment, never in a row an administrator can read.
 */
export default defineEventHandler(async (event) => {
  const session = await requireCapability(event, 'integrations:write')
  const { integrations } = await validatedBody(event, integrationSettingsUpdateSchema)

  return updateIntegrations(event, session, integrations)
})
