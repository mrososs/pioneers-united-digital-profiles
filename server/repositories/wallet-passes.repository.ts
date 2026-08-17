import type { Tables, TablesInsert } from '#shared/types/database.types'
import type { WalletPassStatus, WalletProvider } from '#shared/constants/wallet'
import type { Client } from './profiles.repository'

/** Data access for wallet pass bookkeeping. Holds no credentials — see docs/wallet.md. */

type WalletPassRow = Tables<'wallet_passes'>

export async function listWalletPassesForOrganization(
  client: Client,
  organizationId: string,
): Promise<(WalletPassRow & { profiles: Pick<Tables<'profiles'>, 'id' | 'slug' | 'name_en' | 'name_ar'> | null })[]> {
  const { data, error } = await client
    .from('wallet_passes')
    .select('*, profiles!inner(id, slug, name_en, name_ar, organization_id)')
    .eq('profiles.organization_id', organizationId)
    .order('updated_at', { ascending: false })

  if (error) throw error

  return data ?? []
}

export async function findWalletPass(
  client: Client,
  profileId: string,
  provider: WalletProvider,
): Promise<WalletPassRow | null> {
  const { data, error } = await client
    .from('wallet_passes')
    .select('*')
    .eq('profile_id', profileId)
    .eq('provider', provider)
    .maybeSingle()

  if (error) throw error

  return data
}

/**
 * Records the outcome of a generation attempt.
 *
 * One row per (profile, provider) — the unique index makes this an upsert — so the
 * provider-side `external_id` stays stable across regenerations. That id is what
 * Apple and Google use to push an update to an already-installed pass, so losing it
 * would orphan every pass already in a recipient's wallet.
 */
export async function recordWalletPass(
  client: Client,
  values: TablesInsert<'wallet_passes'> & { status: WalletPassStatus },
): Promise<WalletPassRow> {
  const { data, error } = await client
    .from('wallet_passes')
    .upsert(values, { onConflict: 'profile_id,provider' })
    .select('*')
    .single()

  if (error) throw error

  return data
}
