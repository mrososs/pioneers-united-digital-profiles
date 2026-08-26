import { describe, expect, it } from 'vitest'
import type { PublicProfileSection } from '#shared/types/profile-section'
import { toPrintEntries } from '../../app/utils/profile-print'

/**
 * The print normaliser decides what survives the trip from screen to paper.
 *
 * Its failure mode is quiet: a field that silently maps to nothing does not throw
 * and does not look broken — the PDF simply omits a credential's issuer, and
 * nobody notices until a client asks why their exported profile is thinner than
 * their web one. These tests pin each kind's mapping down field by field.
 */
function section(overrides: Partial<PublicProfileSection> & Pick<PublicProfileSection, 'kind' | 'items'>): PublicProfileSection {
  return {
    id: 'section-1',
    anchor: `section-${overrides.kind}`,
    title: null,
    sortOrder: 0,
    ...overrides,
  } as PublicProfileSection
}

describe('toPrintEntries', () => {
  it('folds an experience entry into role, organisation · period, summary', () => {
    const entries = toPrintEntries(section({
      kind: 'experience',
      items: [{
        role: 'Chief Development Officer',
        organization: 'Pioneers United',
        period: '2019 — Present',
        summary: 'Owns the development pipeline.',
      }],
    }))

    expect(entries).toEqual([{
      primary: 'Chief Development Officer',
      secondary: 'Pioneers United · 2019 — Present',
      body: 'Owns the development pipeline.',
      secondaryLtr: false,
    }])
  })

  it('omits absent parts of a qualifying line rather than leaving a dangling separator', () => {
    // "Pioneers United · " with nothing after it is the kind of thing that only
    // shows up once the PDF is already in front of a client.
    const entries = toPrintEntries(section({
      kind: 'experience',
      items: [{ role: 'Engineer', organization: 'Pioneers United', period: null, summary: null }],
    }))

    expect(entries[0]?.secondary).toBe('Pioneers United')
  })

  it('leaves the qualifying line null when nothing qualifies it', () => {
    const entries = toPrintEntries(section({
      kind: 'credentials',
      items: [{ name: 'PMP', issuer: null, year: null, url: null }],
    }))

    expect(entries[0]?.secondary).toBeNull()
  })

  it('joins a credential issuer and year', () => {
    const entries = toPrintEntries(section({
      kind: 'credentials',
      items: [{ name: 'MRICS', issuer: 'RICS', year: '2017', url: null }],
    }))

    expect(entries[0]).toEqual({ primary: 'MRICS', secondary: 'RICS · 2017', body: null, secondaryLtr: false })
  })

  it('surfaces a document url as the visible secondary line', () => {
    // Paper cannot be clicked, so the destination has to be readable.
    const entries = toPrintEntries(section({
      kind: 'documents',
      items: [{
        title: 'Curriculum vitae',
        description: 'Full professional history.',
        url: 'https://example.com/cv.pdf',
        fileType: 'PDF',
      }],
    }))

    expect(entries[0]).toEqual({
      primary: 'Curriculum vitae',
      secondary: 'https://example.com/cv.pdf',
      body: 'Full professional history.',
      secondaryLtr: true,
    })
  })

  it('maps an office to name, phone and address', () => {
    const entries = toPrintEntries(section({
      kind: 'offices',
      items: [{
        name: 'Riyadh — Head office',
        address: 'King Fahd Road, Al Olaya',
        mapUrl: 'https://maps.example.com',
        phone: '+966541094444',
      }],
    }))

    expect(entries[0]).toEqual({
      primary: 'Riyadh — Head office',
      secondary: '+966541094444',
      body: 'King Fahd Road, Al Olaya',
      secondaryLtr: true,
    })
  })

  it('maps a language to name and level', () => {
    const entries = toPrintEntries(section({
      kind: 'languages',
      items: [{ name: 'Arabic', level: 'Native' }],
    }))

    expect(entries[0]).toEqual({ primary: 'Arabic', secondary: 'Native', body: null, secondaryLtr: false })
  })

  it('returns nothing for the two kinds that keep their own print treatment', () => {
    // metrics and expertise are drawn by ProfilePrintSections directly; an entry
    // list would flatten a figure row into a bullet list.
    expect(toPrintEntries(section({
      kind: 'metrics',
      items: [{ value: '18', label: 'Years' }],
    }))).toEqual([])

    expect(toPrintEntries(section({
      kind: 'expertise',
      items: [{ label: 'Land assembly' }],
    }))).toEqual([])
  })
})
