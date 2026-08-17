import { serverSupabaseServiceRole } from '#supabase/server'
import { listWalletPassesForOrganization } from '../../../repositories/wallet-passes.repository'
import { walletProviderSummary } from '../../../services/wallet/wallet.service'
import { requireAdmin } from '../../../utils/auth'
import { fromPostgrestError } from '../../../utils/errors'

/**
 * GET /api/admin/wallet/passes
 *
 * Pass bookkeeping for the caller's organization, plus provider configuration status
 * so the screen can explain why a Generate button is disabled.
 */
export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  const client = serverSupabaseServiceRole(event)

  setHeader(event, 'cache-control', 'no-store')

  try {
    const rows = await listWalletPassesForOrganization(client, session.organizationId)

    return {
      passes: rows.map(row => ({
        id: row.id,
        profileId: row.profile_id,
        profileSlug: row.profiles?.slug ?? null,
        profileNameEn: row.profiles?.name_en ?? null,
        profileNameAr: row.profiles?.name_ar ?? null,
        provider: row.provider,
        status: row.status,
        externalId: row.external_id,
        lastGeneratedAt: row.last_generated_at,
        // Already sanitised and truncated when it was written.
        lastError: row.last_error,
        updatedAt: row.updated_at,
      })),
      providerStatus: walletProviderSummary(),
    }
  }
  catch (error) {
    throw fromPostgrestError(error, event)
  }
})
