import { z } from 'zod'
import { LOCALE_CODES } from '#shared/constants/locales'
import { QR_ERROR_CORRECTION_LEVELS, QR_FORMATS, QR_MAX_SIZE, QR_MIN_SIZE } from '#shared/constants/qr'
import { profileSlugParamSchema } from '#shared/schemas/profile.schema'
import { getPublicProfile } from '../../../services/profile.service'
import { qrFileName, renderQrPng, renderQrSvg } from '../../../services/qr/qr.service'
import { validatedParams, validatedQuery } from '../../../utils/validation'

/**
 * GET /api/profiles/:slug/qr?format=svg|png&size=512&locale=en&download=1
 *
 * Renders the profile's QR code on demand.
 *
 * The encoded payload is ALWAYS the canonical profile URL returned by the service —
 * never a value from the query string. Accepting the payload as a parameter would
 * turn this into an open QR generator that renders arbitrary attacker-chosen
 * destinations under the pioneersunited.com domain.
 *
 * The profile must be published: the lookup goes through getPublicProfile, so a draft
 * has no QR code.
 */

const querySchema = z.object({
  format: z.enum(QR_FORMATS).default('svg'),
  locale: z.enum(LOCALE_CODES).default('en'),
  size: z.coerce.number().int().min(QR_MIN_SIZE).max(QR_MAX_SIZE).default(512),
  margin: z.coerce.number().int().min(0).max(8).default(2),
  ecc: z.enum(QR_ERROR_CORRECTION_LEVELS).default('M'),
  dark: z.string().regex(/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional(),
  light: z.string().regex(/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional(),
  download: z.coerce.boolean().default(false),
})

export default defineEventHandler(async (event) => {
  const { slug } = validatedParams(event, profileSlugParamSchema)
  const query = validatedQuery(event, querySchema)

  const profile = await getPublicProfile(event, slug, query.locale)

  const options = {
    size: query.size,
    margin: query.margin,
    errorCorrectionLevel: query.ecc,
    ...(query.dark === undefined ? {} : { dark: query.dark }),
    ...(query.light === undefined ? {} : { light: query.light }),
  }

  setHeader(event, 'cache-control', 'public, max-age=3600, stale-while-revalidate=86400')
  setHeader(event, 'x-content-type-options', 'nosniff')

  if (query.download) {
    setHeader(event, 'content-disposition', `attachment; filename="${qrFileName(slug, query.format)}"`)
  }

  if (query.format === 'png') {
    setHeader(event, 'content-type', 'image/png')
    return renderQrPng(profile.canonicalUrl, options)
  }

  setHeader(event, 'content-type', 'image/svg+xml; charset=utf-8')
  return renderQrSvg(profile.canonicalUrl, options)
})
