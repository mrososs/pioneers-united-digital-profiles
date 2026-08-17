import type { H3Event } from 'h3'
import type { ZodType } from 'zod'
import type { ApiFieldErrors } from '#shared/types/api'
import { apiError } from './errors'

/**
 * Zod-backed request parsing.
 *
 * RULE: every server handler validates its inputs here, with the same schema the
 * client form uses. Browser validation is a convenience for the user; this is the
 * boundary that actually protects the database. A handler that reads `readBody()`
 * directly is a bug.
 */

/** Zod issue paths become dot-paths the form layer can match against a field. */
function toFieldErrors(issues: { path: readonly PropertyKey[], message: string }[]): ApiFieldErrors {
  const fieldErrors: ApiFieldErrors = {}

  for (const issue of issues) {
    const key = issue.path.length > 0 ? issue.path.map(String).join('.') : '_'
    const existing = fieldErrors[key]
    if (existing) existing.push(issue.message)
    else fieldErrors[key] = [issue.message]
  }

  return fieldErrors
}

function parseOrThrow<T>(schema: ZodType<T>, input: unknown, event: H3Event): T {
  const result = schema.safeParse(input)

  if (!result.success) {
    throw apiError({
      code: 'validation_error',
      fieldErrors: toFieldErrors(result.error.issues),
      event,
      // The issues carry field names and messages only — no user secrets.
      internal: { issues: result.error.issues },
    })
  }

  return result.data
}

/** Validates the JSON body. Rejects a body that is not an object. */
export async function validatedBody<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  let raw: unknown

  try {
    raw = await readBody(event)
  }
  catch (error) {
    throw apiError({ code: 'validation_error', event, internal: error })
  }

  return parseOrThrow(schema, raw ?? {}, event)
}

/** Validates the query string. */
export function validatedQuery<T>(event: H3Event, schema: ZodType<T>): T {
  return parseOrThrow(schema, getQuery(event), event)
}

/** Validates route parameters (`/api/profiles/[slug]`). */
export function validatedParams<T>(event: H3Event, schema: ZodType<T>): T {
  return parseOrThrow(schema, getRouterParams(event), event)
}
