import { DEFAULT_LOCALE } from '#shared/constants/locales'

/**
 * vue-i18n runtime options. Locale *files* are declared in `nuxt.config.ts`;
 * this file only configures formatting behaviour.
 */
export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: DEFAULT_LOCALE,
  // Missing keys are a bug, not a runtime warning to live with. They stay silent
  // in production but are surfaced during development by the `missing` handler.
  fallbackWarn: false,
  missingWarn: false,
  // Keyed by LOCALE CODE (`en`, `ar`), not BCP 47 tag — the tag is declared per locale in
  // nuxt.config.ts and is what ends up in `<html lang>`; vue-i18n formats by code.
  datetimeFormats: {
    en: {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    },
    ar: {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    },
  },
  numberFormats: {
    en: { decimal: { style: 'decimal', maximumFractionDigits: 2 } },
    ar: { decimal: { style: 'decimal', maximumFractionDigits: 2 } },
  },
}))
