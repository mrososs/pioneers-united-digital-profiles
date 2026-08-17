import { z } from 'zod'
import { LOCALE_CODES } from '#shared/constants/locales'
import { WALLET_PROVIDERS } from '#shared/constants/wallet'
import { slugSchema } from '#shared/schemas/common.schema'
import { getPublicProfile } from '../../../services/profile.service'
import { walletAdapter } from '../../../services/wallet/wallet.service'
import { apiError, notConfigured } from '../../../utils/errors'
import { requestLogger } from '../../../utils/logger'
import { validatedParams, validatedQuery } from '../../../utils/validation'

/**
 * GET /api/wallet/:provider/:slug?locale=en|ar
 *
 * The public "Add to Apple/Google Wallet" endpoint. Anonymous by design — the pass
 * is for the person who scanned the QR code, and requiring a sign-in would defeat
 * the purpose of a business card.
 *
 * WHILE CREDENTIALS ARE MISSING
 *   Answers 503 with code `not_configured` and the names of the absent environment
 *   variables logged (never returned). The UI hides the button when the provider
 *   reports itself unconfigured, so this is the defensive path rather than the
 *   expected one.
 *
 * WHAT THIS ROUTE MUST NEVER DO
 *   Accept any pass content from the query string, and return anything derived from
 *   the signing credentials other than the finished artifact.
 */

const paramsSchema = z.object({
  provider: z.enum(WALLET_PROVIDERS),
  slug: slugSchema,
})

const querySchema = z.object({
  locale: z.enum(LOCALE_CODES).default('en'),
})

export default defineEventHandler(async (event) => {
  const { provider, slug } = validatedParams(event, paramsSchema)
  const { locale } = validatedQuery(event, querySchema)

  const adapter = walletAdapter(provider)
  const status = adapter.status()

  if (!status.configured) {
    throw notConfigured(status.missingConfiguration, event)
  }

  // Published profiles only.
  const profile = await getPublicProfile(event, slug, locale)

  try {
    const artifact = await adapter.generate({
      profileId: slug,
      slug,
      locale,
      name: profile.name,
      jobTitle: profile.jobTitle,
      organizationName: profile.organization.name,
      email: profile.email,
      phone: profile.phone,
      profileUrl: profile.canonicalUrl,
      photoUrl: profile.photoUrl,
      brand: {
        backgroundColor: 'rgb(25,35,65)',
        foregroundColor: 'rgb(252,253,253)',
        labelColor: 'rgb(225,129,70)',
      },
      existingExternalId: null,
    })

    if (artifact.kind === 'link') {
      // Google returns a signed save URL; hand it to the browser as a redirect so the
      // button behaves like a normal link.
      return sendRedirect(event, artifact.url, 302)
    }

    setHeader(event, 'content-type', artifact.mimeType)
    setHeader(event, 'content-disposition', `attachment; filename="${artifact.fileName}"`)
    setHeader(event, 'cache-control', 'no-store')
    return artifact.body
  }
  catch (error) {
    requestLogger(event).error('wallet_pass_generation_failed', { provider, slug, detail: error })
    throw apiError({ code: 'upstream_error', event })
  }
})
