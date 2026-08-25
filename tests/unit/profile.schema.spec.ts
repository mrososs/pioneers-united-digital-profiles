import { describe, expect, it } from 'vitest'
import { profileCreateSchema, profileUpdateSchema } from '#shared/schemas/profile.schema'
import { optionalSafeUrlSchema, slugSchema } from '#shared/schemas/common.schema'

/**
 * These schemas are the boundary that protects the database, because the same objects run
 * in the browser form AND inside the Nitro handler. A gap here is a gap in the API, so the
 * tests concentrate on the rules that exist for safety rather than tidiness.
 */

const validProfile = {
  organizationId: '11111111-1111-4111-8111-111111111111',
  slug: 'sample-executive',
  nameEn: 'Sample Executive',
  nameAr: 'نموذج تنفيذي',
}

const { slug: _slug, ...validProfileWithoutSlug } = validProfile

describe('slugSchema', () => {
  it('accepts lowercase kebab-case', () => {
    expect(slugSchema.parse('mohammed-alqahtani')).toBe('mohammed-alqahtani')
  })

  it('lowercases input rather than rejecting it', () => {
    expect(slugSchema.parse('Sample-Executive')).toBe('sample-executive')
  })

  it.each([
    ['spaces', 'sample executive'],
    ['underscores', 'sample_executive'],
    ['leading hyphen', '-sample'],
    ['trailing hyphen', 'sample-'],
    ['double hyphen', 'sample--executive'],
    ['path traversal', '../etc/passwd'],
    ['slash', 'a/b'],
  ])('rejects %s', (_label, value) => {
    expect(slugSchema.safeParse(value).success).toBe(false)
  })

  it('rejects slugs that would shadow application routes', () => {
    // A profile called `admin` would sit on top of the dashboard.
    for (const reserved of ['admin', 'api', 'login', 'qr', 'wallet']) {
      const result = slugSchema.safeParse(reserved)
      expect(result.success, `expected "${reserved}" to be reserved`).toBe(false)
    }
  })
})

describe('optionalSafeUrlSchema', () => {
  it('accepts http and https', () => {
    expect(optionalSafeUrlSchema.parse('https://pioneersunited.com')).toBe('https://pioneersunited.com')
    expect(optionalSafeUrlSchema.parse('http://example.test')).toBe('http://example.test')
  })

  it('normalises an empty string to null', () => {
    expect(optionalSafeUrlSchema.parse('')).toBeNull()
    expect(optionalSafeUrlSchema.parse('   ')).toBeNull()
  })

  it.each([
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html;base64,PHNjcmlwdD4='],
    ['vbscript:', 'vbscript:msgbox(1)'],
    ['file:', 'file:///etc/passwd'],
    ['not a URL', 'pioneersunited.com'],
  ])('rejects %s', (_label, value) => {
    expect(optionalSafeUrlSchema.safeParse(value).success).toBe(false)
  })
})

describe('profileCreateSchema', () => {
  it('accepts a minimal valid profile and applies defaults', () => {
    const result = profileCreateSchema.parse(validProfile)

    expect(result.profileType).toBe('individual')
    expect(result.status).toBe('draft')
    expect(result.links).toEqual([])
  })

  it('accepts an omitted slug — the server generates one', () => {
    const result = profileCreateSchema.parse(validProfileWithoutSlug)
    expect(result.slug).toBeUndefined()
  })

  it('requires both language variants of the name', () => {
    expect(profileCreateSchema.safeParse({ ...validProfile, nameAr: '' }).success).toBe(false)
    expect(profileCreateSchema.safeParse({ ...validProfile, nameEn: '' }).success).toBe(false)
  })

  it('normalises blank optional text to null so absence has one representation', () => {
    const result = profileCreateSchema.parse({
      ...validProfile,
      jobTitleEn: '   ',
      bioAr: '',
    })

    expect(result.jobTitleEn).toBeNull()
    expect(result.bioAr).toBeNull()
  })

  it('requires E.164 phone numbers', () => {
    expect(profileCreateSchema.parse({ ...validProfile, phone: '+966501234567' }).phone)
      .toBe('+966501234567')

    // Formatting characters are stripped rather than rejected.
    expect(profileCreateSchema.parse({ ...validProfile, phone: '+966 50 123 4567' }).phone)
      .toBe('+966501234567')

    // A local-format number cannot be dialled from a vCard, so it is refused.
    expect(profileCreateSchema.safeParse({ ...validProfile, phone: '0501234567' }).success).toBe(false)
  })

  it('lowercases email addresses', () => {
    const result = profileCreateSchema.parse({ ...validProfile, email: 'Sample.Executive@Example.TEST' })
    expect(result.email).toBe('sample.executive@example.test')
  })

  it('rejects an unknown status or profile type', () => {
    expect(profileCreateSchema.safeParse({ ...validProfile, status: 'live' }).success).toBe(false)
    expect(profileCreateSchema.safeParse({ ...validProfile, profileType: 'robot' }).success).toBe(false)
  })

  it('caps the number of links', () => {
    const links = Array.from({ length: 21 }, () => ({
      type: 'website' as const,
      url: 'https://example.test',
    }))

    expect(profileCreateSchema.safeParse({ ...validProfile, links }).success).toBe(false)
  })

  it('accepts tel: and mailto: links but not other schemes', () => {
    const withLink = (url: string) => profileCreateSchema.safeParse({
      ...validProfile,
      links: [{ type: 'custom', url }],
    }).success

    expect(withLink('tel:+966501234567')).toBe(true)
    expect(withLink('mailto:someone@example.test')).toBe(true)
    expect(withLink('javascript:alert(1)')).toBe(false)
  })
})

describe('profileUpdateSchema', () => {
  it('accepts a single field', () => {
    const result = profileUpdateSchema.parse({ nameEn: 'Renamed Executive' })
    expect(result.nameEn).toBe('Renamed Executive')
  })

  it('rejects an empty payload', () => {
    expect(profileUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('cannot move a profile to another organization', () => {
    const result = profileUpdateSchema.parse({
      nameEn: 'Renamed Executive',
      organizationId: '99999999-9999-4999-8999-999999999999',
    })

    // The field is omitted from the schema, so it is stripped rather than honoured.
    expect('organizationId' in result).toBe(false)
  })
})
