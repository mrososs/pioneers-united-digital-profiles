import { describe, expect, it } from 'vitest'
import { safeAdminRedirect } from '../../app/utils/redirect'

/**
 * The `?redirect=` parameter on the login page is the classic open-redirect surface: an
 * unvalidated value turns a real login form on the real domain into a phishing funnel.
 * Every bypass technique this guard is meant to stop gets a test.
 */

const FALLBACK = '/en/admin'

describe('safeAdminRedirect', () => {
  it('allows a local admin path', () => {
    expect(safeAdminRedirect('/en/admin/profiles', FALLBACK)).toBe('/en/admin/profiles')
    expect(safeAdminRedirect('/ar/admin/settings/company', FALLBACK)).toBe('/ar/admin/settings/company')
    expect(safeAdminRedirect('/admin/profiles', FALLBACK)).toBe('/admin/profiles')
  })

  it.each([
    ['absolute https URL', 'https://evil.example/login'],
    ['absolute http URL', 'http://evil.example'],
    ['protocol-relative URL', '//evil.example/login'],
    ['backslash protocol-relative', '/\\evil.example'],
    ['scheme with encoded prefix', '/\\..\\https://evil.example'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['bare colon', '/admin:8080'],
    ['relative path', 'admin/profiles'],
    ['empty string', ''],
  ])('refuses %s', (_label, value) => {
    expect(safeAdminRedirect(value, FALLBACK)).toBe(FALLBACK)
  })

  it('refuses a local path outside the dashboard', () => {
    // Confining the destination means a stolen redirect cannot land on an arbitrary page.
    expect(safeAdminRedirect('/en/sample-executive', FALLBACK)).toBe(FALLBACK)
    expect(safeAdminRedirect('/', FALLBACK)).toBe(FALLBACK)
  })

  it('refuses to bounce back to the login screen', () => {
    expect(safeAdminRedirect('/en/admin/login', FALLBACK)).toBe(FALLBACK)
  })

  it('refuses non-string and oversized input', () => {
    expect(safeAdminRedirect(undefined, FALLBACK)).toBe(FALLBACK)
    expect(safeAdminRedirect(null, FALLBACK)).toBe(FALLBACK)
    expect(safeAdminRedirect(['/en/admin'], FALLBACK)).toBe(FALLBACK)
    expect(safeAdminRedirect(`/en/admin/${'a'.repeat(600)}`, FALLBACK)).toBe(FALLBACK)
  })
})
