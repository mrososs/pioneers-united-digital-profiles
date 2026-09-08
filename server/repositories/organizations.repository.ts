import type { Tables, TablesInsert, TablesUpdate } from '#shared/types/database.types'
import type { Client } from './profiles.repository'

/** Data access for organizations, branding and integration settings. */

type OrganizationRow = Tables<'organizations'>
type BrandingRow = Tables<'organization_branding'>
type PdfBrandingRow = Tables<'organization_pdf_branding'>
type IntegrationRow = Tables<'integration_settings'>

export async function findOrganizationById(client: Client, id: string): Promise<OrganizationRow | null> {
  const { data, error } = await client
    .from('organizations')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error

  return data
}

export async function findOrganizationBySlug(client: Client, slug: string): Promise<OrganizationRow | null> {
  const { data, error } = await client
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error

  return data
}

export async function updateOrganization(
  client: Client,
  id: string,
  values: TablesUpdate<'organizations'>,
): Promise<OrganizationRow | null> {
  const { data, error } = await client
    .from('organizations')
    .update(values)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw error

  return data
}

export async function findBranding(client: Client, organizationId: string): Promise<BrandingRow | null> {
  const { data, error } = await client
    .from('organization_branding')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error) throw error

  return data
}

/**
 * Upsert rather than update: branding is 1:1 with an organization but the row is
 * created lazily, so the first save must not 404.
 */
export async function upsertBranding(
  client: Client,
  values: TablesInsert<'organization_branding'>,
): Promise<BrandingRow> {
  const { data, error } = await client
    .from('organization_branding')
    .upsert(values, { onConflict: 'organization_id' })
    .select('*')
    .single()

  if (error) throw error

  return data
}

export async function findPdfBranding(client: Client, organizationId: string): Promise<PdfBrandingRow | null> {
  const { data, error } = await client
    .from('organization_pdf_branding')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error) throw error

  return data
}

/**
 * Upsert rather than update: PDF branding is 1:1 with an organization but the row is
 * created lazily, so the first save must not 404.
 */
export async function upsertPdfBranding(
  client: Client,
  values: TablesInsert<'organization_pdf_branding'>,
): Promise<PdfBrandingRow> {
  const { data, error } = await client
    .from('organization_pdf_branding')
    .upsert(values, { onConflict: 'organization_id' })
    .select('*')
    .single()

  if (error) throw error

  return data
}

export async function listIntegrationSettings(
  client: Client,
  organizationId: string,
): Promise<IntegrationRow[]> {
  const { data, error } = await client
    .from('integration_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .order('provider', { ascending: true })

  if (error) throw error

  return data ?? []
}

export async function upsertIntegrationSettings(
  client: Client,
  rows: TablesInsert<'integration_settings'>[],
): Promise<IntegrationRow[]> {
  if (rows.length === 0) return []

  const { data, error } = await client
    .from('integration_settings')
    .upsert(rows, { onConflict: 'organization_id,provider' })
    .select('*')

  if (error) throw error

  return data ?? []
}
