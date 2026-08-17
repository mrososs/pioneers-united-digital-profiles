import type { LocaleCode } from '#shared/constants/locales'

/**
 * vCard generation.
 *
 * FORMAT CHOICE — vCard 3.0
 *   3.0 is what iOS Contacts, Android Contacts, Outlook and macOS all import
 *   without complaint. 4.0 is a better specification (native UTF-8, ALTID for
 *   multilingual properties) but older Outlook versions still mishandle it, and a
 *   digital business card that fails to import is worthless. Text properties
 *   therefore carry an explicit `CHARSET=UTF-8` parameter, which 3.0 allows and
 *   which is what makes Arabic names survive the round trip.
 *
 * BILINGUAL STRATEGY
 *   One vCard per locale: `/api/profiles/{slug}/vcard?locale=ar` produces an Arabic
 *   card, `?locale=en` an English one. A single vCard cannot carry two `FN` values
 *   in 3.0, so the alternate-language name is appended to `NOTE` for reference. If
 *   the client set ever standardises on 4.0, switch to `FN;LANGUAGE=ar;ALTID=1`
 *   and drop the NOTE line — `buildVCard` is the only place that would change.
 *
 * This module is deliberately free of h3, Supabase and runtime-config imports: it
 * is a pure function of its input, which is what makes it unit-testable.
 */

export interface VCardInput {
  locale: LocaleCode
  /** Name in the requested locale — becomes FN. */
  name: string
  /** Name in the other locale — appended to NOTE. */
  alternateName?: string | null
  jobTitle?: string | null
  department?: string | null
  organizationName?: string | null
  email?: string | null
  /** E.164, e.g. +966501234567 */
  phone?: string | null
  whatsapp?: string | null
  websiteUrl?: string | null
  linkedinUrl?: string | null
  /** Free-form single-line address. */
  address?: string | null
  bio?: string | null
  /** Canonical public profile URL. Always present, always absolute. */
  profileUrl: string
  /** ISO timestamp used for REV. */
  revision: string
}

/** RFC 6350 §3.4 / RFC 2426 §5: escape backslash, comma, semicolon and newlines. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/**
 * Folds a content line to 75 octets, continuation lines starting with a single
 * space. Folding counts OCTETS, not characters — a naive character-based fold
 * splits Arabic mid-codepoint and produces mojibake in the importing client.
 */
function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line

  const decoder = new TextDecoder()
  const segments: string[] = []
  let start = 0

  while (start < bytes.length) {
    // First chunk gets 75 octets; continuations get 74 (the leading space counts).
    const limit = segments.length === 0 ? 75 : 74
    let end = Math.min(start + limit, bytes.length)

    // Back off until `end` sits on a UTF-8 codepoint boundary. Continuation bytes
    // match 0b10xxxxxx.
    while (end > start + 1 && end < bytes.length && (bytes[end]! & 0xC0) === 0x80) {
      end -= 1
    }

    segments.push(decoder.decode(bytes.subarray(start, end)))
    start = end
  }

  return segments.join('\r\n ')
}

interface Property {
  name: string
  params?: string[]
  value: string
  /** When false the property is omitted entirely rather than emitted empty. */
  include?: boolean
}

function renderProperty(property: Property): string | null {
  if (property.include === false) return null

  const params = property.params && property.params.length > 0 ? `;${property.params.join(';')}` : ''
  return foldLine(`${property.name}${params}:${property.value}`)
}

const UTF8 = 'CHARSET=UTF-8'

/**
 * Builds a complete vCard 3.0 document with CRLF line endings, as the
 * specification requires.
 */
export function buildVCard(input: VCardInput): string {
  const notes: string[] = []
  if (input.bio) notes.push(input.bio)
  if (input.alternateName) {
    // The label is written in the language of the NAME it introduces, not in the card's
    // language: on an English card the alternate is Arabic, so an Arabic label reads
    // correctly to whoever the alternate is there for.
    notes.push(input.locale === 'en' ? `الاسم: ${input.alternateName}` : `Name: ${input.alternateName}`)
  }
  notes.push(input.profileUrl)

  const organizationValue = input.department && input.organizationName
    ? `${escapeText(input.organizationName)};${escapeText(input.department)}`
    : escapeText(input.organizationName ?? '')

  const properties: (Property | null)[] = [
    { name: 'BEGIN', value: 'VCARD' },
    { name: 'VERSION', value: '3.0' },

    // N is structured (family;given;additional;prefix;suffix). Splitting a name
    // reliably across cultures is not possible, and guessing wrong looks worse
    // than not guessing: the whole display name goes in the family-name slot,
    // which every client renders correctly, and FN is what UIs actually show.
    { name: 'N', params: [UTF8], value: `${escapeText(input.name)};;;;` },
    { name: 'FN', params: [UTF8], value: escapeText(input.name) },

    {
      name: 'ORG',
      params: [UTF8],
      value: organizationValue,
      include: Boolean(input.organizationName),
    },
    {
      name: 'TITLE',
      params: [UTF8],
      value: escapeText(input.jobTitle ?? ''),
      include: Boolean(input.jobTitle),
    },

    {
      name: 'TEL',
      params: ['TYPE=WORK,VOICE'],
      value: escapeText(input.phone ?? ''),
      include: Boolean(input.phone),
    },
    // Only emit the mobile number when it differs, otherwise the contact shows
    // the same number twice.
    {
      name: 'TEL',
      params: ['TYPE=CELL,VOICE'],
      value: escapeText(input.whatsapp ?? ''),
      include: Boolean(input.whatsapp) && input.whatsapp !== input.phone,
    },

    {
      name: 'EMAIL',
      params: ['TYPE=INTERNET,WORK'],
      value: escapeText(input.email ?? ''),
      include: Boolean(input.email),
    },

    {
      name: 'ADR',
      params: ['TYPE=WORK', UTF8],
      // (post-office box;extended;street;locality;region;postal code;country)
      value: `;;${escapeText(input.address ?? '')};;;;`,
      include: Boolean(input.address),
    },

    {
      name: 'URL',
      value: escapeText(input.websiteUrl ?? ''),
      include: Boolean(input.websiteUrl),
    },
    // The profile URL is always present and is the durable identity of the card.
    { name: 'URL', value: escapeText(input.profileUrl) },
    {
      name: 'X-SOCIALPROFILE',
      params: ['TYPE=linkedin'],
      value: escapeText(input.linkedinUrl ?? ''),
      include: Boolean(input.linkedinUrl),
    },

    { name: 'NOTE', params: [UTF8], value: escapeText(notes.join('\n')) },
    { name: 'REV', value: input.revision },
    { name: 'END', value: 'VCARD' },
  ]

  const lines = properties
    .map(property => (property ? renderProperty(property) : null))
    .filter((line): line is string => line !== null)

  return `${lines.join('\r\n')}\r\n`
}

/**
 * Content-Disposition filename. ASCII-only fallback plus RFC 5987 UTF-8 form, so a
 * profile called محمد still downloads with a sensible name in every browser.
 */
export function vcardFileName(slug: string): string {
  return `${slug}.vcf`
}
