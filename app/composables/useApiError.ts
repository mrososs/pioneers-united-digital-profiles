import type { ApiErrorPayload, ApiFieldErrors } from '#shared/types/api'

/**
 * Turns whatever `$fetch` threw into something a form can render.
 *
 * Every API route answers failures with `ApiErrorPayload` (see server/utils/errors.ts),
 * so the happy path here is simply reading `data.messageKey` and `data.fieldErrors`.
 * The fallbacks exist for the cases that never reach a handler at all — the network
 * dropped, a proxy returned HTML, the request was aborted.
 *
 * Field error values are i18n KEYS, not sentences, which is what lets one server
 * response render correctly in both English and Arabic.
 */

interface FetchLikeError {
  statusCode?: number
  status?: number
  data?: unknown
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return (
    typeof value === 'object'
    && value !== null
    && 'code' in value
    && 'messageKey' in value
    && typeof (value as { messageKey: unknown }).messageKey === 'string'
  )
}

export function useApiError() {
  const { t, te } = useI18n()

  /** i18n key for a human-facing message. */
  function messageKeyOf(error: unknown): string {
    const candidate = (error as FetchLikeError | null)?.data

    if (isApiErrorPayload(candidate)) return candidate.messageKey

    const status = (error as FetchLikeError | null)?.statusCode ?? (error as FetchLikeError | null)?.status

    switch (status) {
      case 401:
        return 'errors.unauthenticated'
      case 403:
        return 'errors.forbidden'
      case 404:
        return 'errors.notFound'
      case 409:
        return 'errors.conflict'
      case 422:
        return 'errors.validation'
      case 429:
        return 'errors.rateLimited'
      case 503:
        return 'errors.notConfigured'
      default:
        return 'errors.internal'
    }
  }

  /** Translated message, safe to show a user. Never contains server internals. */
  function messageOf(error: unknown): string {
    const key = messageKeyOf(error)
    return te(key) ? t(key) : t('errors.internal')
  }

  /** Per-field messages, already translated, keyed by the form field path. */
  function fieldErrorsOf(error: unknown): Record<string, string> {
    const candidate = (error as FetchLikeError | null)?.data

    if (!isApiErrorPayload(candidate) || !candidate.fieldErrors) return {}

    const raw: ApiFieldErrors = candidate.fieldErrors
    const translated: Record<string, string> = {}

    for (const [field, keys] of Object.entries(raw)) {
      const first = keys[0]
      if (first === undefined) continue
      translated[field] = te(first) ? t(first) : t('errors.validation')
    }

    return translated
  }

  /** Support reference for a bug report. */
  function requestIdOf(error: unknown): string | null {
    const candidate = (error as FetchLikeError | null)?.data
    return isApiErrorPayload(candidate) ? candidate.requestId ?? null : null
  }

  return { messageKeyOf, messageOf, fieldErrorsOf, requestIdOf }
}
