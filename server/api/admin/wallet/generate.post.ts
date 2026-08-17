import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { LOCALE_CODES } from '#shared/constants/locales'
import { WALLET_PROVIDERS } from '#shared/constants/wallet'
import { uuidSchema } from '#shared/schemas/common.schema'
import { recordWalletPass } from '../../../repositories/wallet-passes.repository'
import { getProfileForAdmin } from '../../../services/profile.service'
import { sanitiseProviderError, walletAdapter } from '../../../services/wallet/wallet.service'
import { requireCapability } from '../../../utils/auth'
import { apiError, notConfigured } from '../../../utils/errors'
import { requestLogger } from '../../../utils/logger'
import { validatedBody } from '../../../utils/validation'
import { profileUrl } from '../../../utils/urls'
import { localised } from '../../../repositories/profile.mapper'
import { getOrganizationForAdmin } from '../../../services/organization.service'

/**
 * POST /api/admin/wallet/generate
 *
 * Generates or regenerates a wallet pass for one profile.
 *
 * Every failure is recorded against the wallet_passes row with a sanitised message, so
 * an operator can see what went wrong without the raw provider response — which can
 * embed request payloads and tokens — being persisted anywhere.
 *
 * Until credentials are provisioned this answers 503 `not_configured`.
 */
const bodySchema = z.object({
  profileId: uuidSchema,
  provider: z.enum(WALLET_PROVIDERS),
  locale: z.enum(LOCALE_CODES).default('en'),
})

export default defineEventHandler(async (event) => {
  const session = await requireCapability(event, 'wallet:generate')
  const { profileId, provider, locale } = await validatedBody(event, bodySchema)

  const adapter = walletAdapter(provider)
  const status = adapter.status()

  if (!status.configured) {
    throw notConfigured(status.missingConfiguration, event)
  }

  // Tenancy is verified here.
  const profile = await getProfileForAdmin(event, session, profileId)
  const organization = await getOrganizationForAdmin(event, session)

  const client = serverSupabaseServiceRole(event)

  try {
    const artifact = await adapter.generate({
      profileId: profile.id,
      slug: profile.slug,
      locale,
      name: localised(locale, profile.nameEn, profile.nameAr) ?? profile.nameEn,
      jobTitle: localised(locale, profile.jobTitleEn, profile.jobTitleAr),
      organizationName: localised(locale, organization.nameEn, organization.nameAr) ?? organization.nameEn,
      email: profile.email,
      phone: profile.phone,
      profileUrl: profileUrl(locale, profile.slug),
      photoUrl: profile.photoUrl,
      brand: {
        backgroundColor: 'rgb(25,35,65)',
        foregroundColor: 'rgb(252,253,253)',
        labelColor: 'rgb(225,129,70)',
      },
      existingExternalId: null,
    })

    const pass = await recordWalletPass(client, {
      profile_id: profile.id,
      provider,
      external_id: artifact.externalId,
      status: 'active',
      last_generated_at: new Date().toISOString(),
      last_error: null,
    })

    return {
      pass,
      ...(artifact.kind === 'link' ? { saveUrl: artifact.url } : { downloadUrl: `/api/wallet/${provider}/${profile.slug}` }),
    }
  }
  catch (error) {
    requestLogger(event).error('wallet_pass_generation_failed', { provider, profileId, detail: error })

    await recordWalletPass(client, {
      profile_id: profile.id,
      provider,
      status: 'failed',
      last_error: sanitiseProviderError(error),
    }).catch(() => {
      // Bookkeeping must not mask the original failure.
    })

    throw apiError({ code: 'upstream_error', event })
  }
})
