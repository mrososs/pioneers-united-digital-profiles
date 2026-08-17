import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { Tables, TablesInsert } from '#shared/types/database.types'
import { STORAGE_BUCKETS } from '#shared/constants/storage'
import { WALLET_PROVIDERS } from '#shared/constants/wallet'
import type { Branding, Organization } from '#shared/types/organization'
import type { AdminSession } from '#shared/types/session'
import type { BrandingUpdateInput, IntegrationSettingWriteInput } from '#shared/schemas/settings.schema'
import type { OrganizationUpdateInput } from '#shared/schemas/organization.schema'
import * as organizationsRepository from '../repositories/organizations.repository'
import { toOrganization } from '../repositories/profile.mapper'
import { assertCanManageOrganization } from '../utils/auth'
import { fromPostgrestError, notFound } from '../utils/errors'
import { publicStorageUrl } from '../utils/urls'

/** Organization, branding and integration business rules. */

type BrandingRow = Tables<'organization_branding'>
type IntegrationRow = Tables<'integration_settings'>

function toBranding(row: BrandingRow): Branding {
  return {
    organizationId: row.organization_id,
    primaryColor: row.primary_color,
    primaryForegroundColor: row.primary_foreground_color,
    accentColor: row.accent_color,
    logoPath: row.logo_path,
    logoUrl: publicStorageUrl(STORAGE_BUCKETS.brandAssets, row.logo_path),
    logoDarkPath: row.logo_dark_path,
    logoDarkUrl: publicStorageUrl(STORAGE_BUCKETS.brandAssets, row.logo_dark_path),
    faviconPath: row.favicon_path,
    ogImagePath: row.og_image_path,
    ogImageUrl: publicStorageUrl(STORAGE_BUCKETS.brandAssets, row.og_image_path),
    defaultLocale: row.default_locale,
    footerNoteEn: row.footer_note_en,
    footerNoteAr: row.footer_note_ar,
    updatedAt: row.updated_at,
  }
}

/**
 * Public organization lookup by slug, through the request-scoped client so RLS
 * applies. Used by the public layout to resolve branding without authentication.
 */
export async function getPublicOrganization(event: H3Event, slug: string): Promise<Organization> {
  const client = await serverSupabaseClient(event)

  try {
    const row = await organizationsRepository.findOrganizationBySlug(client, slug)
    if (!row) throw notFound(event)

    return toOrganization(row)
  }
  catch (error) {
    throw fromPostgrestError(error, event)
  }
}

export async function getOrganizationForAdmin(
  event: H3Event,
  session: AdminSession,
): Promise<Organization> {
  const client = serverSupabaseServiceRole(event)

  try {
    const row = await organizationsRepository.findOrganizationById(client, session.organizationId)
    if (!row) throw notFound(event)

    return toOrganization(row)
  }
  catch (error) {
    throw fromPostgrestError(error, event)
  }
}

export async function updateOrganizationForAdmin(
  event: H3Event,
  session: AdminSession,
  input: OrganizationUpdateInput,
): Promise<Organization> {
  assertCanManageOrganization(event, session, session.organizationId)

  const client = serverSupabaseServiceRole(event)

  const values: Record<string, unknown> = {}
  const assign = (column: string, value: unknown) => {
    if (value !== undefined) values[column] = value
  }

  assign('name_en', input.nameEn)
  assign('name_ar', input.nameAr)
  assign('slug', input.slug)
  assign('tagline_en', input.taglineEn)
  assign('tagline_ar', input.taglineAr)
  assign('website', input.website)
  assign('email', input.email)
  assign('phone', input.phone)
  assign('address_en', input.addressEn)
  assign('address_ar', input.addressAr)
  assign('logo_path', input.logoPath)

  try {
    const row = await organizationsRepository.updateOrganization(client, session.organizationId, values)
    if (!row) throw notFound(event)

    return toOrganization(row)
  }
  catch (error) {
    throw fromPostgrestError(error, event)
  }
}

/**
 * Branding for an organization. Returns defaults rather than 404 when no row exists
 * yet, so the settings form always has something to render.
 */
export async function getBranding(event: H3Event, organizationId: string): Promise<Branding> {
  const client = serverSupabaseServiceRole(event)

  try {
    const row = await organizationsRepository.findBranding(client, organizationId)

    if (row) return toBranding(row)

    return {
      organizationId,
      primaryColor: null,
      primaryForegroundColor: null,
      accentColor: null,
      logoPath: null,
      logoUrl: null,
      logoDarkPath: null,
      logoDarkUrl: null,
      faviconPath: null,
      ogImagePath: null,
      ogImageUrl: null,
      defaultLocale: 'en',
      footerNoteEn: null,
      footerNoteAr: null,
      updatedAt: new Date(0).toISOString(),
    }
  }
  catch (error) {
    throw fromPostgrestError(error, event)
  }
}

export async function updateBranding(
  event: H3Event,
  session: AdminSession,
  input: BrandingUpdateInput,
): Promise<Branding> {
  const client = serverSupabaseServiceRole(event)

  const values: TablesInsert<'organization_branding'> = {
    organization_id: session.organizationId,
  }

  const assign = <K extends keyof TablesInsert<'organization_branding'>>(
    column: K,
    value: TablesInsert<'organization_branding'>[K] | undefined,
  ) => {
    if (value !== undefined) values[column] = value
  }

  assign('primary_color', input.primaryColor)
  assign('primary_foreground_color', input.primaryForegroundColor)
  assign('accent_color', input.accentColor)
  assign('logo_path', input.logoPath)
  assign('logo_dark_path', input.logoDarkPath)
  assign('favicon_path', input.faviconPath)
  assign('og_image_path', input.ogImagePath)
  assign('default_locale', input.defaultLocale)
  assign('footer_note_en', input.footerNoteEn)
  assign('footer_note_ar', input.footerNoteAr)

  try {
    const row = await organizationsRepository.upsertBranding(client, values)
    return toBranding(row)
  }
  catch (error) {
    throw fromPostgrestError(error, event)
  }
}

export interface IntegrationSetting {
  provider: string
  enabled: boolean
  config: Record<string, unknown>
  updatedAt: string
}

function toIntegrationSetting(row: IntegrationRow): IntegrationSetting {
  return {
    provider: row.provider,
    enabled: row.enabled,
    config: (typeof row.config === 'object' && row.config !== null && !Array.isArray(row.config))
      ? row.config as Record<string, unknown>
      : {},
    updatedAt: row.updated_at,
  }
}

/**
 * Integration settings, one entry per known provider. Providers with no row yet are
 * returned as disabled so the settings screen lists every provider consistently.
 */
export async function listIntegrations(
  event: H3Event,
  session: AdminSession,
): Promise<IntegrationSetting[]> {
  const client = serverSupabaseServiceRole(event)

  try {
    const rows = await organizationsRepository.listIntegrationSettings(client, session.organizationId)
    const byProvider = new Map(rows.map(row => [row.provider, toIntegrationSetting(row)]))

    return WALLET_PROVIDERS.map(provider => byProvider.get(provider) ?? {
      provider,
      enabled: false,
      config: {},
      updatedAt: new Date(0).toISOString(),
    })
  }
  catch (error) {
    throw fromPostgrestError(error, event)
  }
}

export async function updateIntegrations(
  event: H3Event,
  session: AdminSession,
  integrations: IntegrationSettingWriteInput[],
): Promise<IntegrationSetting[]> {
  const client = serverSupabaseServiceRole(event)

  const rows: TablesInsert<'integration_settings'>[] = integrations.map(integration => ({
    organization_id: session.organizationId,
    provider: integration.provider,
    enabled: integration.enabled,
    // The Zod schema already rejects credential-shaped keys, and a database trigger
    // rejects them again. Two layers, because this is the one table an operator might
    // be tempted to paste a key into.
    config: integration.config,
  }))

  try {
    await organizationsRepository.upsertIntegrationSettings(client, rows)
    return listIntegrations(event, session)
  }
  catch (error) {
    throw fromPostgrestError(error, event)
  }
}
