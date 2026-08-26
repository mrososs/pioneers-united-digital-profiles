import type { Tables } from '#shared/types/database.types'
import type { LocaleCode } from '#shared/constants/locales'
import { defaultSectionOrder } from '#shared/constants/profile-sections'
import type { ProfileSection, PublicProfileSection } from '#shared/types/profile-section'
import { localised } from './profile.mapper'

/**
 * Maps `profile_sections` rows onto DTOs.
 *
 * WHY THE READ PATH DOES NOT RE-RUN THE ZOD SCHEMA
 *   `payload` is JSONB, so a row written before a schema variant changed can hold a
 *   shape the current union would reject. Parsing on read would mean one stale row
 *   turning a whole public profile into a 500. Instead the readers below are
 *   *tolerant*: they narrow defensively, take the fields they recognise, and drop
 *   everything else. Writes stay strict — that is where correctness is enforced —
 *   and reads degrade to a smaller card rather than an error page.
 *
 * WHY IT IS SEPARATE FROM profile.mapper.ts
 *   That module maps a fixed row shape onto a fixed DTO. This one interprets an
 *   open payload, which is a different kind of work with its own failure mode.
 */

type ProfileSectionRow = Tables<'profile_sections'>

// -----------------------------------------------------------------------------
// Defensive readers
// -----------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `payload.items`, keeping only entries that are actually objects. */
function itemsOf(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload)) return []

  const items = payload.items
  if (!Array.isArray(items)) return []

  return items.filter(isRecord)
}

/** A trimmed string field, or null when absent, blank or the wrong type. */
function text(item: Record<string, unknown>, key: string): string | null {
  const value = item[key]
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * A paired `*En`/`*Ar` field resolved for one locale, with the same
 * other-language fallback the column mapper applies. A block filled in only in
 * English still renders on the Arabic page.
 */
function pair(item: Record<string, unknown>, base: string, locale: LocaleCode): string | null {
  return localised(locale, text(item, `${base}En`), text(item, `${base}Ar`))
}

/** Drops entries where every visible field resolved to null. */
function nonEmpty<T extends object>(items: T[]): T[] {
  return items.filter(item => Object.values(item).some(value => value !== null))
}

// -----------------------------------------------------------------------------
// Dashboard projection
// -----------------------------------------------------------------------------

export function toProfileSection(row: ProfileSectionRow): ProfileSection {
  return {
    id: row.id,
    kind: row.kind,
    titleEn: row.title_en,
    titleAr: row.title_ar,
    payload: isRecord(row.payload) ? row.payload : {},
    sortOrder: row.sort_order,
    enabled: row.enabled,
  }
}

// -----------------------------------------------------------------------------
// Public projection
// -----------------------------------------------------------------------------

/**
 * One row → one locale-resolved section.
 *
 * Returns null when the block has no renderable content left after resolution,
 * so an operator who created a section and never filled it in does not leave an
 * empty heading on the public page. "Empty must look deliberate" — an absent
 * block is deliberate; a heading with nothing under it is not.
 */
export function toPublicProfileSection(
  row: ProfileSectionRow,
  locale: LocaleCode,
): PublicProfileSection | null {
  const base = {
    id: row.id,
    anchor: `section-${row.kind}`,
    title: localised(locale, row.title_en, row.title_ar),
    sortOrder: row.sort_order,
  }

  const raw = itemsOf(row.payload)

  switch (row.kind) {
    case 'metrics': {
      const items = nonEmpty(raw.map(item => ({
        value: pair(item, 'value', locale),
        label: pair(item, 'label', locale),
      })))
      return items.length > 0 ? { ...base, kind: 'metrics', items } : null
    }

    case 'expertise': {
      const items = nonEmpty(raw.map(item => ({
        label: pair(item, 'label', locale),
      })))
      return items.length > 0 ? { ...base, kind: 'expertise', items } : null
    }

    case 'services': {
      const items = nonEmpty(raw.map(item => ({
        icon: text(item, 'icon'),
        title: pair(item, 'title', locale),
        description: pair(item, 'description', locale),
      })))
      return items.length > 0 ? { ...base, kind: 'services', items } : null
    }

    case 'experience': {
      const items = nonEmpty(raw.map(item => ({
        role: pair(item, 'role', locale),
        organization: pair(item, 'organization', locale),
        period: pair(item, 'period', locale),
        summary: pair(item, 'summary', locale),
      })))
      return items.length > 0 ? { ...base, kind: 'experience', items } : null
    }

    case 'credentials': {
      const items = nonEmpty(raw.map(item => ({
        name: pair(item, 'name', locale),
        issuer: pair(item, 'issuer', locale),
        year: text(item, 'year'),
        url: text(item, 'url'),
      })))
      return items.length > 0 ? { ...base, kind: 'credentials', items } : null
    }

    case 'recognition': {
      const items = nonEmpty(raw.map(item => ({
        title: pair(item, 'title', locale),
        source: pair(item, 'source', locale),
        year: text(item, 'year'),
        url: text(item, 'url'),
      })))
      return items.length > 0 ? { ...base, kind: 'recognition', items } : null
    }

    case 'languages': {
      const items = nonEmpty(raw.map(item => ({
        name: pair(item, 'name', locale),
        level: pair(item, 'level', locale),
      })))
      return items.length > 0 ? { ...base, kind: 'languages', items } : null
    }

    case 'offices': {
      const items = nonEmpty(raw.map(item => ({
        name: pair(item, 'name', locale),
        address: pair(item, 'address', locale),
        mapUrl: text(item, 'mapUrl'),
        phone: text(item, 'phone'),
      })))
      return items.length > 0 ? { ...base, kind: 'offices', items } : null
    }

    case 'documents': {
      // A document card with nothing to open is not a document card.
      const items = raw
        .map(item => ({
          title: pair(item, 'title', locale),
          description: pair(item, 'description', locale),
          url: text(item, 'url'),
          fileType: text(item, 'fileType'),
        }))
        .filter(item => item.url !== null)
      return items.length > 0 ? { ...base, kind: 'documents', items } : null
    }
  }
}

/**
 * Every enabled section of a profile, resolved and ordered.
 *
 * `sortOrder` is the operator's choice and wins; `defaultSectionOrder` breaks ties
 * so a set of blocks that were all inserted at 0 still reads in the intended
 * dossier order rather than in whatever order PostgREST returned them.
 */
export function toPublicProfileSections(
  rows: ProfileSectionRow[],
  locale: LocaleCode,
): PublicProfileSection[] {
  return rows
    .filter(row => row.enabled)
    .map(row => toPublicProfileSection(row, locale))
    .filter((section): section is PublicProfileSection => section !== null)
    .sort((a, b) =>
      a.sortOrder - b.sortOrder
      || defaultSectionOrder(a.kind) - defaultSectionOrder(b.kind)
      || a.id.localeCompare(b.id),
    )
}
