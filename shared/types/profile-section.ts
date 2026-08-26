import type { ProfileSectionKind } from '#shared/constants/profile-sections'

/**
 * Profile section DTOs.
 *
 * TWO SHAPES, ON PURPOSE
 *   `ProfileSection` is what the dashboard edits: both languages, still in the
 *   paired `*En`/`*Ar` form, because an editor has to show and save both.
 *
 *   `PublicProfileSection` is what a visitor receives: one locale, already
 *   resolved, with the fallback applied. A renderer component therefore never
 *   contains a locale branch — it takes strings and draws them. That is what keeps
 *   the Arabic and English pages a single component tree rather than two.
 *
 * The union below is discriminated on `kind`, so a renderer that has narrowed to
 * `metrics` cannot reach for an `experience` field.
 */

// -----------------------------------------------------------------------------
// Dashboard-facing
// -----------------------------------------------------------------------------

export interface ProfileSection {
  id: string
  kind: ProfileSectionKind
  titleEn: string | null
  titleAr: string | null
  /** Validated against the matching variant in profile-section.schema.ts. */
  payload: Record<string, unknown>
  sortOrder: number
  enabled: boolean
}

// -----------------------------------------------------------------------------
// Public, locale-resolved
// -----------------------------------------------------------------------------

interface PublicSectionBase {
  id: string
  /** Stable fragment target for the section navigation: `section-{kind}`. */
  anchor: string
  /** Operator's heading override. Null means "use the translated default". */
  title: string | null
  sortOrder: number
}

export interface PublicMetricItem {
  value: string | null
  label: string | null
}

export interface PublicTagItem {
  label: string | null
}

export interface PublicServiceItem {
  icon: string | null
  title: string | null
  description: string | null
}

export interface PublicExperienceItem {
  role: string | null
  organization: string | null
  period: string | null
  summary: string | null
}

export interface PublicCredentialItem {
  name: string | null
  issuer: string | null
  year: string | null
  url: string | null
}

export interface PublicRecognitionItem {
  title: string | null
  source: string | null
  year: string | null
  url: string | null
}

export interface PublicLanguageItem {
  name: string | null
  level: string | null
}

export interface PublicOfficeItem {
  name: string | null
  address: string | null
  mapUrl: string | null
  phone: string | null
}

export interface PublicDocumentItem {
  title: string | null
  description: string | null
  url: string | null
  fileType: string | null
}

export type PublicProfileSection
  = | (PublicSectionBase & { kind: 'metrics', items: PublicMetricItem[] })
    | (PublicSectionBase & { kind: 'expertise', items: PublicTagItem[] })
    | (PublicSectionBase & { kind: 'services', items: PublicServiceItem[] })
    | (PublicSectionBase & { kind: 'experience', items: PublicExperienceItem[] })
    | (PublicSectionBase & { kind: 'credentials', items: PublicCredentialItem[] })
    | (PublicSectionBase & { kind: 'recognition', items: PublicRecognitionItem[] })
    | (PublicSectionBase & { kind: 'languages', items: PublicLanguageItem[] })
    | (PublicSectionBase & { kind: 'offices', items: PublicOfficeItem[] })
    | (PublicSectionBase & { kind: 'documents', items: PublicDocumentItem[] })
