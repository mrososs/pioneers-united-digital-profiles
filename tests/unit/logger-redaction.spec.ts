import { describe, expect, it } from 'vitest'
import { redact } from '../../server/utils/logger'

/**
 * Redaction is the difference between "we have logs" and "we have logs that leaked the
 * service-role key". These tests exist so a future change to the logger cannot quietly
 * remove the protection.
 */

describe('redact', () => {
  it('removes values under credential-shaped keys at any depth', () => {
    const result = redact({
      email: 'admin@example.test',
      password: 'hunter2',
      nested: {
        serviceRoleKey: 'sb_secret_abc',
        deeper: { apiKey: 'abc123' },
      },
    }) as Record<string, unknown>

    expect(result.email).toBe('admin@example.test')
    expect(result.password).toBe('[redacted]')

    const nested = result.nested as Record<string, unknown>
    expect(nested.serviceRoleKey).toBe('[redacted]')
    expect((nested.deeper as Record<string, unknown>).apiKey).toBe('[redacted]')
  })

  it('redacts credential-shaped VALUES even under an innocent key name', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl'

    const result = redact({
      note: jwt,
      supabase: 'sb_secret_0123456789abcdef',
      pem: '-----BEGIN PRIVATE KEY-----\nMIIEvQ==\n-----END PRIVATE KEY-----',
    }) as Record<string, unknown>

    expect(result.note).toBe('[redacted]')
    expect(result.supabase).toBe('[redacted]')
    expect(result.pem).toBe('[redacted]')
  })

  it('keeps error name, message and a bounded stack', () => {
    const result = redact(new Error('database unavailable')) as Record<string, unknown>

    expect(result.name).toBe('Error')
    expect(result.message).toBe('database unavailable')
    expect(typeof result.stack).toBe('string')
    expect((result.stack as string).split('\n').length).toBeLessThanOrEqual(8)
  })

  it('truncates very long strings so one log line cannot flood the sink', () => {
    const result = redact('x'.repeat(5000)) as string

    expect(result.length).toBeLessThan(5000)
    expect(result.endsWith('[truncated]')).toBe(true)
  })

  it('bounds recursion depth', () => {
    // A deeply nested or cyclic-shaped object must not hang the logger.
    let deep: Record<string, unknown> = { value: 'leaf' }
    for (let index = 0; index < 20; index += 1) deep = { child: deep }

    expect(() => redact(deep)).not.toThrow()
    expect(JSON.stringify(redact(deep))).toContain('depth-limit')
  })

  it('caps array length', () => {
    const result = redact(Array.from({ length: 200 }, (_value, index) => index)) as unknown[]

    expect(result).toHaveLength(50)
  })

  it('passes primitives through unchanged', () => {
    expect(redact(42)).toBe(42)
    expect(redact(true)).toBe(true)
    expect(redact(null)).toBeNull()
  })
})
