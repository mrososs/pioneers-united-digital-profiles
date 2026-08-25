import type { H3Event } from 'h3'
import type { PostgrestError } from '@supabase/supabase-js'
import type { ApiErrorCode, ApiErrorPayload, ApiFieldErrors } from '#shared/types/api'
import { logger } from './logger'

/**
 * The concrete error type `createError()` produces in this project. Derived rather than
 * imported so it stays correct whether the auto-import resolves to h3's `H3Error` or
 * Nuxt's `NuxtError` wrapper.
 */
type ApiErrorInstance = ReturnType<typeof createError>

/**
 * One error shape for the whole API.
 *
 * PRINCIPLE
 *   The client receives a stable machine code plus an i18n message key. It never
 *   receives a SQL message, a constraint name, a stack trace or a provider
 *   response body — those go to the server log, correlated by `requestId`, so
 *   support can find the detail without leaking schema internals to an attacker.
 */

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  validation_error: 422,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  not_configured: 503,
  upstream_error: 502,
  internal_error: 500,
}

const DEFAULT_MESSAGE_KEY: Record<ApiErrorCode, string> = {
  validation_error: 'errors.validation',
  unauthenticated: 'errors.unauthenticated',
  forbidden: 'errors.forbidden',
  not_found: 'errors.notFound',
  conflict: 'errors.conflict',
  rate_limited: 'errors.rateLimited',
  not_configured: 'errors.notConfigured',
  upstream_error: 'errors.upstream',
  internal_error: 'errors.internal',
}

export interface ApiErrorOptions {
  code: ApiErrorCode
  /** Overrides the default i18n key for this code. */
  messageKey?: string
  fieldErrors?: ApiFieldErrors
  /** Server-only detail. Logged, never serialised to the client. */
  internal?: unknown
  event?: H3Event
}

/**
 * Builds the H3Error thrown by handlers. `data` is the only part the client sees.
 */
export function apiError(options: ApiErrorOptions): ApiErrorInstance {
  const { code, messageKey, fieldErrors, internal, event } = options
  const requestId = event?.context.requestId

  const payload: ApiErrorPayload = {
    code,
    messageKey: messageKey ?? DEFAULT_MESSAGE_KEY[code],
    ...(fieldErrors ? { fieldErrors } : {}),
    ...(requestId ? { requestId } : {}),
  }

  if (internal !== undefined) {
    const level = STATUS_BY_CODE[code] >= 500 ? 'error' : 'warn'
    logger[level](`api_error:${code}`, {
      requestId,
      route: event?.path,
      detail: internal,
    })
  }

  return createError({
    statusCode: STATUS_BY_CODE[code],
    // `statusMessage` is visible to the client; keep it generic.
    statusMessage: code,
    data: payload,
  })
}

export const notFound = (event?: H3Event) => apiError({ code: 'not_found', event })
export const unauthenticated = (event?: H3Event) => apiError({ code: 'unauthenticated', event })
export const forbidden = (event?: H3Event) => apiError({ code: 'forbidden', event })

export function notConfigured(missing: string[], event?: H3Event): ApiErrorInstance {
  return apiError({
    code: 'not_configured',
    event,
    // Names of missing env vars are safe to log; their values are not, and are
    // never read here.
    internal: { missingConfiguration: missing },
  })
}

function isPostgrestError(value: unknown): value is PostgrestError {
  return (
    typeof value === 'object'
    && value !== null
    && 'code' in value
    && 'message' in value
    && typeof (value as { message: unknown }).message === 'string'
  )
}

/**
 * True for a unique-violation on `profiles_slug_key`. Shared with
 * `createProfile()`, which retries a server-generated slug on exactly this
 * error rather than surfacing it to the administrator.
 */
export function isSlugCollisionError(error: unknown): boolean {
  return (
    isPostgrestError(error)
    && error.code === '23505'
    && error.message.includes('profiles_slug_key')
  )
}

function isH3Error(value: unknown): value is ApiErrorInstance {
  return typeof value === 'object' && value !== null && '__h3_error__' in value
}

/**
 * Maps a PostgREST/Postgres failure to a safe API error.
 *
 * The mapping matters for correctness as well as safety: a unique-violation on
 * `profiles_slug_key` is a 409 the user can fix by changing the slug, not a 500.
 */
export function fromPostgrestError(error: unknown, event?: H3Event): ApiErrorInstance {
  if (isH3Error(error)) return error

  if (!isPostgrestError(error)) {
    return apiError({ code: 'internal_error', event, internal: error })
  }

  switch (error.code) {
    // Unique violation.
    case '23505': {
      const isSlugCollision = isSlugCollisionError(error) || error.message.includes('organizations_slug_key')
      return apiError({
        code: 'conflict',
        messageKey: isSlugCollision ? 'validation.slugTaken' : 'errors.conflict',
        ...(isSlugCollision ? { fieldErrors: { slug: ['validation.slugTaken'] } } : {}),
        event,
        internal: error,
      })
    }

    // Foreign key violation — the client referenced something that is gone.
    case '23503':
      return apiError({ code: 'not_found', event, internal: error })

    // Check constraint / not-null violation: the database rejected data the Zod
    // schema should already have caught, so it is a validation error *and* a bug.
    case '23514':
    case '23502':
      return apiError({ code: 'validation_error', event, internal: error })

    // RLS denied the operation, or the role lacks the privilege.
    case '42501':
      return apiError({ code: 'forbidden', event, internal: error })

    // PGRST116: `.single()` matched no rows.
    case 'PGRST116':
      return apiError({ code: 'not_found', event, internal: error })

    default:
      return apiError({ code: 'internal_error', event, internal: error })
  }
}
