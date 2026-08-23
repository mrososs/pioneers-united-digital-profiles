import { z } from 'zod'
import { LOCALE_CODES } from '#shared/constants/locales'
import { profileSlugParamSchema } from '#shared/schemas/profile.schema'
import { getPublicProfile } from '../../../services/profile.service'
import { pdfFileName, renderProfilePdf } from '../../../services/pdf/pdf.service'
import { apiError } from '../../../utils/errors'
import { validatedParams, validatedQuery } from '../../../utils/validation'

/**
 * GET /api/profiles/:slug/pdf?locale=en|ar
 *
 * Returns a downloadable, printable PDF of a published profile. See
 * server/services/pdf/pdf.service.ts for how it is rendered and why.
 *
 * The profile is looked up first, through the same published-only path as
 * every other public route, so a draft or missing slug 404s before a browser
 * is ever launched — a bad slug should not pay for a Chromium cold start.
 */

const querySchema = z.object({
  locale: z.enum(LOCALE_CODES).default('en'),
})

export default defineEventHandler(async (event) => {
  const { slug } = validatedParams(event, profileSlugParamSchema)
  const { locale } = validatedQuery(event, querySchema)

  await getPublicProfile(event, slug, locale)

  let pdf: Buffer
  try {
    pdf = await renderProfilePdf({ slug, locale })
  }
  catch (error) {
    throw apiError({ code: 'upstream_error', event, internal: error })
  }

  setHeader(event, 'content-type', 'application/pdf')
  setHeader(event, 'content-disposition', `attachment; filename="${pdfFileName(slug)}"`)
  setHeader(event, 'cache-control', 'public, max-age=300')
  setHeader(event, 'x-content-type-options', 'nosniff')

  return pdf
})
