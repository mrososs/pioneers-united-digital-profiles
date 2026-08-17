import type { H3Event } from 'h3'

/**
 * Structured server logging with mandatory redaction.
 *
 * WHY THIS EXISTS RATHER THAN BARE `console`
 *   Server logs are shipped off the host and retained. A single accidental
 *   `console.log(config)` or `console.error(error)` on a Supabase/Apple/Google
 *   error object is enough to persist a service-role key or a certificate
 *   password into a log aggregator, which then has to be treated as compromised.
 *   Every value logged through here passes the redactor first.
 *
 * NEVER LOG: passwords, access/refresh tokens, JWTs, the Supabase secret key,
 * Apple pass certificates or passwords, Google service-account private keys,
 * raw request bodies from the login route.
 */

const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'silent'] as const

export type LogLevel = typeof LOG_LEVELS[number]

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 100,
}

/** Keys whose values are replaced wholesale, at any depth. */
const REDACTED_KEY_PATTERN
  = /(pass(word)?|secret|token|jwt|authorization|cookie|apikey|api_key|private_key|privatekey|certificate|credential|service_role|serviceRole|anon_key|refresh|session)/i

/** Values that look like a credential even under an innocent key name. */
const CREDENTIAL_VALUE_PATTERNS: RegExp[] = [
  /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/, // JWT
  /^sb_(secret|publishable)_[\w-]+$/, // Supabase API keys
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, // PEM private key
]

const REDACTED = '[redacted]'
const MAX_DEPTH = 6
const MAX_STRING_LENGTH = 2000

function redactValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value

  if (typeof value === 'string') {
    if (CREDENTIAL_VALUE_PATTERNS.some(pattern => pattern.test(value))) return REDACTED
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]` : value
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return value

  if (depth >= MAX_DEPTH) return '[depth-limit]'

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactValue(value.message, depth + 1),
      // Stacks are useful and contain no credentials, but they are long.
      stack: typeof value.stack === 'string' ? value.stack.split('\n').slice(0, 8).join('\n') : undefined,
    }
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map(item => redactValue(item, depth + 1))
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      output[key] = REDACTED_KEY_PATTERN.test(key) ? REDACTED : redactValue(nested, depth + 1)
    }
    return output
  }

  // Functions, symbols: never useful in a log line.
  return `[${typeof value}]`
}

/** Exported for tests: the redactor is the security-relevant part of this module. */
export function redact(value: unknown): unknown {
  return redactValue(value, 0)
}

export interface LogContext {
  requestId?: string
  route?: string
  userId?: string
  [key: string]: unknown
}

function resolveLevel(): LogLevel {
  const configured = useRuntimeConfig().logLevel
  return LOG_LEVELS.includes(configured as LogLevel) ? configured as LogLevel : 'info'
}

function emit(level: Exclude<LogLevel, 'silent'>, message: string, context?: LogContext): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[resolveLevel()]) return

  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(context ? { context: redact(context) as Record<string, unknown> } : {}),
  }

  const line = JSON.stringify(entry)

  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  trace: (message: string, context?: LogContext) => emit('trace', message, context),
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
}

/**
 * Logger bound to a request, so every line carries the same request id and route.
 * The id is also returned to the client in the error envelope, which is what makes
 * a user-reported "something went wrong" traceable to one log entry.
 */
export function requestLogger(event: H3Event) {
  const base: LogContext = {
    requestId: event.context.requestId,
    route: event.path,
  }

  const withBase = (context?: LogContext): LogContext => ({ ...base, ...context })

  return {
    trace: (message: string, context?: LogContext) => logger.trace(message, withBase(context)),
    debug: (message: string, context?: LogContext) => logger.debug(message, withBase(context)),
    info: (message: string, context?: LogContext) => logger.info(message, withBase(context)),
    warn: (message: string, context?: LogContext) => logger.warn(message, withBase(context)),
    error: (message: string, context?: LogContext) => logger.error(message, withBase(context)),
  }
}
