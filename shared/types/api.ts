/**
 * Transport contracts shared by Nitro handlers and the Nuxt app.
 *
 * Every failing API route answers with this envelope so the UI has exactly one
 * error shape to render. Internal details (SQL, stack traces, provider
 * responses) are logged server-side and deliberately excluded here.
 */

export const API_ERROR_CODES = [
  'validation_error',
  'unauthenticated',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'not_configured',
  'upstream_error',
  'internal_error',
] as const

export type ApiErrorCode = typeof API_ERROR_CODES[number]

/** Field-level validation problems, keyed by dot-path (`links.0.url`). */
export type ApiFieldErrors = Record<string, string[]>

export interface ApiErrorPayload {
  code: ApiErrorCode
  /** i18n message key, e.g. `errors.notFound`. Never a raw internal message. */
  messageKey: string
  fieldErrors?: ApiFieldErrors
  /** Correlates a user-facing error with the server log entry. */
  requestId?: string
}

export interface PaginatedResult<T> {
  items: T[]
  page: number
  perPage: number
  total: number
  totalPages: number
}
