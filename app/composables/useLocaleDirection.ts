import type { LocaleCode } from '#shared/constants/locales'
import { LOCALE_DIRECTION, toLocaleCode } from '#shared/constants/locales'

/**
 * The active locale, narrowed to `LocaleCode`, plus its writing direction.
 *
 * Components should almost never need `isRtl`: layout mirroring belongs to Tailwind's
 * logical utilities (`ps-*`, `pe-*`, `ms-*`, `text-start`, `border-s`), which follow
 * the document `dir` automatically. Use this only where direction genuinely changes
 * behaviour rather than layout — chevron icons that must point "forward", carousel
 * scroll maths, that kind of thing.
 */
export function useLocaleDirection() {
  const { locale } = useI18n()

  const currentLocale = computed<LocaleCode>(() => toLocaleCode(locale.value))
  const direction = computed(() => LOCALE_DIRECTION[currentLocale.value])
  const isRtl = computed(() => direction.value === 'rtl')

  return { currentLocale, direction, isRtl }
}
