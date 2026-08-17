import { z } from 'zod'
import { LOCALE_CODES } from '#shared/constants/locales'
import { profileSlugParamSchema } from '#shared/schemas/profile.schema'
import { getVCardSource } from '../../../services/profile.service'
import { buildVCard, vcardFileName } from '../../../services/vcard/vcard.service'
import { validatedParams, validatedQuery } from '../../../utils/validation'

/**
 * GET /api/profiles/:slug/vcard?locale=en|ar
 *
 * Returns a downloadable .vcf for a published profile.
 *
 * HEADERS THAT MATTER
 *   Content-Type: text/vcard; charset=utf-8
 *     The charset parameter is what makes iOS and Android decode Arabic names
 *     correctly. Without it some clients assume Latin-1 and import mojibake.
 *
 *   Content-Disposition: attachment; filename="slug.vcf"
 *     Forces a download rather than in-browser display. The filename is built from
 *     the slug, which is validated ASCII kebab-case, so it needs no RFC 5987
 *     encoding and cannot be used for header injection.
 */

const querySchema = z.object({
  locale: z.enum(LOCALE_CODES).default('en'),
})

export default defineEventHandler(async (event) => {
  const { slug } = validatedParams(event, profileSlugParamSchema)
  const { locale } = validatedQuery(event, querySchema)

  const source = await getVCardSource(event, slug, locale)

  const vcard = buildVCard({
    locale,
    name: source.name,
    alternateName: source.alternateName,
    jobTitle: source.jobTitle,
    department: source.department,
    organizationName: source.organizationName,
    email: source.email,
    phone: source.phone,
    whatsapp: source.whatsapp,
    websiteUrl: source.websiteUrl,
    linkedinUrl: source.linkedinUrl,
    address: source.address,
    bio: source.bio,
    profileUrl: source.profileUrl,
    revision: source.updatedAt,
  })

  setHeader(event, 'content-type', 'text/vcard; charset=utf-8')
  setHeader(event, 'content-disposition', `attachment; filename="${vcardFileName(slug)}"`)
  setHeader(event, 'cache-control', 'public, max-age=300')
  setHeader(event, 'x-content-type-options', 'nosniff')

  return vcard
})
