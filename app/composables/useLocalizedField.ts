import type { MaybeRefOrGetter } from 'vue'
import type { LocaleCode } from '#shared/constants/locales'

/**
 * Picks the right half of an `*_en` / `*_ar` field pair for the active locale, falling
 * back to the other language when the preferred one is empty.
 *
 * Public profile responses arrive already locale-resolved from the server, so this is
 * for the DASHBOARD, which holds both languages at once (an editor needs to see and
 * compare them). Keeping the fallback rule in one place means an admin table never
 * shows a blank cell just because the Arabic title has not been written yet.
 *
 * Inputs accept a value, a ref or a getter so a caller can pass whatever it already
 * has; `toValue()` normalises them inside the computed.
 */
export function useLocalizedField() {
  const { locale } = useI18n()

  function pick(
    english: MaybeRefOrGetter<string | null | undefined>,
    arabic: MaybeRefOrGetter<string | null | undefined>,
  ): string | null {
    const isArabic = locale.value === 'ar'
    const preferred = toValue(isArabic ? arabic : english)
    const fallback = toValue(isArabic ? english : arabic)

    const trimmedPreferred = preferred?.trim()
    if (trimmedPreferred) return trimmedPreferred

    const trimmedFallback = fallback?.trim()
    return trimmedFallback || null
  }

  /** Reactive variant for template bindings. */
  function localized(
    english: MaybeRefOrGetter<string | null | undefined>,
    arabic: MaybeRefOrGetter<string | null | undefined>,
  ) {
    return computed(() => pick(english, arabic))
  }

  /** Convenience for objects that follow the `<field>En` / `<field>Ar` convention. */
  function fromPair<T extends Record<string, unknown>>(
    source: MaybeRefOrGetter<T | null | undefined>,
    field: string,
  ) {
    return computed(() => {
      const value = toValue(source)
      if (!value) return null

      return pick(
        value[`${field}En`] as string | null | undefined,
        value[`${field}Ar`] as string | null | undefined,
      )
    })
  }

  return { locale: locale as Ref<LocaleCode | string>, pick, localized, fromPair }
}
