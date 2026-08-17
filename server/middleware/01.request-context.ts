/**
 * Assigns every request a correlation id.
 *
 * The id is attached to every log line for the request and returned inside the API
 * error envelope. That is what turns "it said something went wrong" into a single
 * log lookup, without ever putting an internal message in front of the user.
 *
 * An inbound `x-request-id` is honoured so a reverse proxy or load balancer can
 * correlate too, but it is length-capped and stripped of anything but URL-safe
 * characters — it ends up in log output, so it is treated as untrusted input.
 */
export default defineEventHandler((event) => {
  const inbound = getRequestHeader(event, 'x-request-id')

  const sanitised = typeof inbound === 'string'
    ? inbound.replace(/[^\w.-]/g, '').slice(0, 64)
    : ''

  event.context.requestId = sanitised.length > 0 ? sanitised : crypto.randomUUID()
})
