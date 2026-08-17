import { profileCreateSchema } from '#shared/schemas/profile.schema'
import { createProfile } from '../../../services/profile.service'
import { requireCapability } from '../../../utils/auth'
import { validatedBody } from '../../../utils/validation'

/**
 * POST /api/admin/profiles
 *
 * Creates a profile. The body is parsed with the same Zod schema the editor form
 * uses, so a request crafted outside the UI faces identical rules.
 *
 * A slug collision surfaces as 409 with a `slug` field error (mapped from the unique
 * index in server/utils/errors.ts), which the form renders inline.
 */
export default defineEventHandler(async (event) => {
  const session = await requireCapability(event, 'profiles:write')
  const input = await validatedBody(event, profileCreateSchema)

  const profile = await createProfile(event, session, input)

  setResponseStatus(event, 201)

  return profile
})
