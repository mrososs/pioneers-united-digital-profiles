/**
 * Post-login redirect validation.
 *
 * An unvalidated `?redirect=` is a textbook open redirect: `/admin/login?redirect=https://
 * evil.example/login` produces a convincing credential-phishing flow that starts on the
 * real domain. Every value is therefore rejected unless it is unambiguously a local
 * dashboard path.
 *
 * The rules, in order, each of which blocks a known bypass:
 *   1. must start with a single `/`            — rejects absolute URLs
 *   2. must not start with `//` or `/\`        — rejects protocol-relative URLs
 *   3. must not contain a scheme separator     — rejects `/\..\..\https://…` style payloads
 *   4. must resolve to a path under /admin     — confines the destination to the dashboard
 */
export function safeAdminRedirect(candidate: unknown, fallback: string): string {
  if (typeof candidate !== 'string' || candidate.length === 0) return fallback
  if (candidate.length > 512) return fallback

  if (!candidate.startsWith('/')) return fallback
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return fallback
  if (candidate.includes(':')) return fallback
  if (candidate.includes('\\')) return fallback

  // Strip an optional locale prefix before checking the destination.
  const withoutLocale = candidate.replace(/^\/(en|ar)(?=\/|$)/, '')

  if (!withoutLocale.startsWith('/admin')) return fallback

  // Never bounce straight back to the login screen.
  if (withoutLocale.startsWith('/admin/login')) return fallback

  return candidate
}
