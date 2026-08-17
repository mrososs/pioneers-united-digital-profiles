import { z } from 'zod'
import { LOCALE_CODES } from '#shared/constants/locales'
import { profileSlugParamSchema } from '#shared/schemas/profile.schema'
import { getPublicProfile } from '../../../services/profile.service'
import { validatedParams, validatedQuery } from '../../../utils/validation'

/**
 * GET /api/public/profiles/:slug?locale=en|ar
 *
 * The only profile read an anonymous visitor performs. Returns the locale-resolved
 * public projection; unpublished profiles answer 404 (see profile.service.ts).
 *
 * The response is public and identical for every caller, so it is cached at the edge
 * for a minute with a stale-while-revalidate window. A published edit therefore
 * appears within about a minute rather than instantly, which is the right trade for a
 * page that may be linked from printed material.
 */

const querySchema = z.object({
  locale: z.enum(LOCALE_CODES).default('en'),
})

export default defineEventHandler(async (event) => {
  const { slug } = validatedParams(event, profileSlugParamSchema)
  const { locale } = validatedQuery(event, querySchema)

  const profile = await getPublicProfile(event, slug, locale)

  setHeader(event, 'cache-control', 'public, max-age=60, stale-while-revalidate=600')
  // The payload differs per locale, and the locale arrives in the query string, so
  // no Vary header is needed — but it must never be cached per-user.
  setHeader(event, 'vary', 'accept-encoding')

  return profile
})
