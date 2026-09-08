import type { LocaleCode } from '#shared/constants/locales'

/** Full organization record, dashboard-facing. */
export interface Organization {
  id: string
  slug: string
  nameEn: string
  nameAr: string
  taglineEn: string | null
  taglineAr: string | null
  website: string | null
  email: string | null
  phone: string | null
  addressEn: string | null
  addressAr: string | null
  logoPath: string | null
  logoUrl: string | null
  createdAt: string
  updatedAt: string
}

/** Locale-resolved subset embedded in every public profile response. */
export interface OrganizationSummary {
  slug: string
  name: string
  tagline: string | null
  website: string | null
  address: string | null
  logoUrl: string | null
}

export interface Branding {
  organizationId: string
  primaryColor: string | null
  primaryForegroundColor: string | null
  accentColor: string | null
  logoPath: string | null
  logoUrl: string | null
  logoDarkPath: string | null
  logoDarkUrl: string | null
  faviconPath: string | null
  ogImagePath: string | null
  ogImageUrl: string | null
  defaultLocale: LocaleCode
  footerNoteEn: string | null
  footerNoteAr: string | null
  updatedAt: string
}

/** Background/text/line colours applied to the exported profile PDF, per profile type. */
export interface PdfBranding {
  organizationId: string
  individualBackgroundColor: string | null
  individualTextColor: string | null
  individualLineColor: string | null
  companyBackgroundColor: string | null
  companyTextColor: string | null
  companyLineColor: string | null
  updatedAt: string
}

/** The trio resolved for one profile type — what the PDF print view actually consumes. */
export interface PdfBrandingColors {
  backgroundColor: string | null
  textColor: string | null
  lineColor: string | null
}
