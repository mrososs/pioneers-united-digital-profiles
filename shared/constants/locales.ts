/**
 * Locale constants. These are the single source of truth for the locale codes
 * used by routing, the database's `*_en` / `*_ar` column pairs and the i18n
 * message catalogues.
 */

export const LOCALE_CODES = ['en', 'ar'] as const

export type LocaleCode = typeof LOCALE_CODES[number]

export const DEFAULT_LOCALE: LocaleCode = 'en'

export const LOCALE_DIRECTION: Record<LocaleCode, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl',
}

/** BCP 47 tags used for `<html lang>`, hreflang and Intl formatting. */
export const LOCALE_LANGUAGE_TAG: Record<LocaleCode, string> = {
  en: 'en-US',
  ar: 'ar-SA',
}

/** Endonyms, shown in the locale switcher. */
export const LOCALE_NATIVE_NAME: Record<LocaleCode, string> = {
  en: 'English',
  ar: 'العربية',
}

export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === 'string' && (LOCALE_CODES as readonly string[]).includes(value)
}

/** Narrows an arbitrary value to a supported locale, falling back to English. */
export function toLocaleCode(value: unknown): LocaleCode {
  return isLocaleCode(value) ? value : DEFAULT_LOCALE
}

/** The other locale — used for "read this page in ..." links. */
export function alternateLocale(locale: LocaleCode): LocaleCode {
  return locale === 'en' ? 'ar' : 'en'
}
