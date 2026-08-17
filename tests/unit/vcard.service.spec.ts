import { describe, expect, it } from 'vitest'
import { buildVCard, vcardFileName } from '../../server/services/vcard/vcard.service'

/**
 * vCard generation is the single most compatibility-sensitive output this platform
 * produces: it is parsed by iOS Contacts, Android, Outlook and macOS, and a malformed
 * card fails silently — the user just sees "cannot import". These tests pin the
 * properties that break real clients rather than the exact byte layout.
 */

const baseInput = {
  locale: 'en' as const,
  name: 'Sample Executive',
  profileUrl: 'https://profile.pioneersunited.com/en/sample-executive',
  revision: '2026-08-17T10:00:00.000Z',
}

function lines(vcard: string): string[] {
  return vcard.split('\r\n')
}

describe('buildVCard', () => {
  it('produces a well-formed vCard 3.0 envelope with CRLF line endings', () => {
    const vcard = buildVCard(baseInput)

    expect(vcard.startsWith('BEGIN:VCARD\r\n')).toBe(true)
    expect(vcard.endsWith('END:VCARD\r\n')).toBe(true)
    expect(lines(vcard)).toContain('VERSION:3.0')

    // A bare \n anywhere would break stricter parsers.
    expect(vcard.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('emits FN and N for the display name', () => {
    const vcard = buildVCard(baseInput)

    expect(vcard).toContain('FN;CHARSET=UTF-8:Sample Executive')
    expect(vcard).toContain('N;CHARSET=UTF-8:Sample Executive;;;;')
  })

  it('declares CHARSET=UTF-8 on text properties so Arabic survives import', () => {
    const vcard = buildVCard({
      ...baseInput,
      locale: 'ar',
      name: 'نموذج تنفيذي',
      jobTitle: 'الرئيس التنفيذي',
      organizationName: 'بيونيرز يونايتد',
    })

    expect(vcard).toContain('FN;CHARSET=UTF-8:نموذج تنفيذي')
    expect(vcard).toContain('TITLE;CHARSET=UTF-8:الرئيس التنفيذي')
    expect(vcard).toContain('ORG;CHARSET=UTF-8:بيونيرز يونايتد')
  })

  it('carries the alternate-language name in NOTE, labelled in that language', () => {
    // English card: the alternate is Arabic, so the label is Arabic.
    const englishCard = buildVCard({
      ...baseInput,
      name: 'Sample Executive',
      alternateName: 'نموذج تنفيذي',
    })

    expect(englishCard).toContain('الاسم: نموذج تنفيذي')

    // Arabic card: the alternate is English, so the label is English.
    const arabicCard = buildVCard({
      ...baseInput,
      locale: 'ar',
      name: 'نموذج تنفيذي',
      alternateName: 'Sample Executive',
    })

    expect(arabicCard).toContain('Name: Sample Executive')
  })

  it('always includes the canonical profile URL', () => {
    const vcard = buildVCard(baseInput)

    expect(vcard).toContain(`URL:${baseInput.profileUrl}`)
  })

  it('escapes characters that would otherwise terminate a property value', () => {
    const vcard = buildVCard({
      ...baseInput,
      name: 'Doe; John, Jr.\\Test',
    })

    expect(vcard).toContain('FN;CHARSET=UTF-8:Doe\\; John\\, Jr.\\\\Test')
  })

  it('converts newlines in free text to the literal \\n escape', () => {
    const vcard = buildVCard({
      ...baseInput,
      bio: 'First line\nSecond line',
    })

    const noteLine = lines(vcard).find(line => line.startsWith('NOTE'))
    expect(noteLine).toBeDefined()
    // The escape is present and no raw newline leaked into the property.
    expect(vcard).toContain('First line\\nSecond line')
  })

  it('omits optional properties rather than emitting them empty', () => {
    const vcard = buildVCard(baseInput)

    expect(vcard).not.toContain('TEL')
    expect(vcard).not.toContain('EMAIL')
    expect(vcard).not.toContain('ADR')
    expect(vcard).not.toContain('TITLE')
  })

  it('does not emit the mobile number twice when it equals the work number', () => {
    const vcard = buildVCard({
      ...baseInput,
      phone: '+966555000001',
      whatsapp: '+966555000001',
    })

    const telLines = lines(vcard).filter(line => line.startsWith('TEL'))
    expect(telLines).toHaveLength(1)
    expect(telLines[0]).toContain('TYPE=WORK,VOICE')
  })

  it('emits both numbers when they differ', () => {
    const vcard = buildVCard({
      ...baseInput,
      phone: '+966555000001',
      whatsapp: '+966555000002',
    })

    expect(lines(vcard).filter(line => line.startsWith('TEL'))).toHaveLength(2)
  })

  it('folds long lines at 75 octets with a leading-space continuation', () => {
    const vcard = buildVCard({
      ...baseInput,
      bio: 'x'.repeat(300),
    })

    const contentLines = lines(vcard).filter(line => line.length > 0)

    for (const line of contentLines) {
      const octets = new TextEncoder().encode(line).length
      // Continuation lines begin with a space; both forms stay within the limit.
      expect(octets).toBeLessThanOrEqual(76)
    }

    expect(vcard).toContain('\r\n ')
  })

  it('folds Arabic text on codepoint boundaries, not mid-character', () => {
    const vcard = buildVCard({
      ...baseInput,
      locale: 'ar',
      // Long enough to force several folds; every character is multi-byte.
      name: 'محمد'.repeat(40),
    })

    // A fold that split a UTF-8 sequence would produce a replacement character.
    expect(vcard).not.toContain('�')
  })

  it('puts department in the second ORG component', () => {
    const vcard = buildVCard({
      ...baseInput,
      organizationName: 'Pioneers United',
      department: 'Corporate Development',
    })

    expect(vcard).toContain('ORG;CHARSET=UTF-8:Pioneers United;Corporate Development')
  })
})

describe('vcardFileName', () => {
  it('derives an ASCII filename from the slug', () => {
    expect(vcardFileName('sample-executive')).toBe('sample-executive.vcf')
  })
})
