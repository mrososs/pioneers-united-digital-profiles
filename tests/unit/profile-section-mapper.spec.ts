import { describe, expect, it } from 'vitest'
import type { Tables } from '#shared/types/database.types'
import { toPublicProfileSection, toPublicProfileSections } from '../../server/repositories/profile-section.mapper'

type SectionRow = Tables<'profile_sections'>

/**
 * The section mapper is the only place a JSONB payload becomes something a
 * component renders, and it is deliberately tolerant: a row written before a
 * schema variant changed must degrade to a smaller card, never to a 500 on the
 * public profile.
 *
 * These tests pin that tolerance down, because "it does not throw" is the kind of
 * property that silently regresses the moment someone adds a `.map()` over a
 * field they assumed was present.
 */

function row(overrides: Partial<SectionRow> = {}): SectionRow {
  return {
    id: 'section-1',
    profile_id: 'profile-1',
    kind: 'metrics',
    title_en: null,
    title_ar: null,
    payload: { items: [] },
    sort_order: 0,
    enabled: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('toPublicProfileSection', () => {
  it('resolves paired fields to the requested locale', () => {
    const section = toPublicProfileSection(
      row({
        kind: 'expertise',
        payload: { items: [{ labelEn: 'Land assembly', labelAr: 'تجميع الأراضي' }] },
      }),
      'ar',
    )

    expect(section?.kind).toBe('expertise')
    expect(section?.items).toEqual([{ label: 'تجميع الأراضي' }])
  })

  it('falls back to the other language rather than dropping the item', () => {
    // A block filled in only in English must still render on the Arabic page.
    // Vanishing content is the failure mode operators never report, because on
    // their own machine the language they typed is the one they look at.
    const section = toPublicProfileSection(
      row({
        kind: 'expertise',
        payload: { items: [{ labelEn: 'Feasibility', labelAr: null }] },
      }),
      'ar',
    )

    expect(section?.items).toEqual([{ label: 'Feasibility' }])
  })

  it('returns null when every field resolved to nothing', () => {
    // An operator who added a block and never filled it in must not leave a
    // heading with empty space under it on the public page.
    const section = toPublicProfileSection(
      row({ kind: 'expertise', payload: { items: [{ labelEn: '  ', labelAr: null }] } }),
      'en',
    )

    expect(section).toBeNull()
  })

  it('survives a payload that is not the shape its kind expects', () => {
    const section = toPublicProfileSection(
      row({ kind: 'metrics', payload: { items: 'not-an-array' } }),
      'en',
    )

    expect(section).toBeNull()
  })

  it('survives a payload that is not an object at all', () => {
    const section = toPublicProfileSection(row({ kind: 'metrics', payload: null }), 'en')

    expect(section).toBeNull()
  })

  it('ignores payload entries that are not objects', () => {
    const section = toPublicProfileSection(
      row({
        kind: 'expertise',
        payload: { items: [null, 'stray', { labelEn: 'Permitting', labelAr: null }] },
      }),
      'en',
    )

    expect(section?.items).toEqual([{ label: 'Permitting' }])
  })

  it('drops document entries with no url, since the card would open nothing', () => {
    const section = toPublicProfileSection(
      row({
        kind: 'documents',
        payload: {
          items: [
            { titleEn: 'No file', titleAr: null },
            { titleEn: 'CV', titleAr: null, url: 'https://example.com/cv.pdf', fileType: 'PDF' },
          ],
        },
      }),
      'en',
    )

    expect(section?.items).toHaveLength(1)
    expect(section?.items[0]).toMatchObject({ title: 'CV', url: 'https://example.com/cv.pdf' })
  })

  it('exposes a stable anchor derived from the kind', () => {
    const section = toPublicProfileSection(
      row({ kind: 'credentials', payload: { items: [{ nameEn: 'PMP', nameAr: null }] } }),
      'en',
    )

    expect(section?.anchor).toBe('section-credentials')
  })

  it('prefers the operator title over the translated default', () => {
    const section = toPublicProfileSection(
      row({
        kind: 'expertise',
        title_en: 'Sectors served',
        title_ar: 'القطاعات',
        payload: { items: [{ labelEn: 'Logistics', labelAr: null }] },
      }),
      'en',
    )

    // Null here means "the renderer picks the translated default" — see
    // useProfileSectionTitle.
    expect(section?.title).toBe('Sectors served')
  })
})

describe('toPublicProfileSections', () => {
  const populated = (kind: SectionRow['kind'], overrides: Partial<SectionRow>) =>
    row({ kind, payload: { items: [{ labelEn: 'x', nameEn: 'x', titleEn: 'x', valueEn: 'x', roleEn: 'x' }] }, ...overrides })

  it('drops disabled sections', () => {
    const sections = toPublicProfileSections(
      [
        populated('expertise', { id: 'a', enabled: false }),
        populated('credentials', { id: 'b', enabled: true }),
      ],
      'en',
    )

    expect(sections.map(section => section.kind)).toEqual(['credentials'])
  })

  it('orders by sort_order first', () => {
    const sections = toPublicProfileSections(
      [
        populated('credentials', { id: 'a', sort_order: 5 }),
        populated('expertise', { id: 'b', sort_order: 1 }),
      ],
      'en',
    )

    expect(sections.map(section => section.kind)).toEqual(['expertise', 'credentials'])
  })

  it('falls back to the canonical dossier order when sort_order ties', () => {
    // Every block inserted at 0 (a scripted import, say) must still read in the
    // intended order rather than in whatever order PostgREST happened to return.
    const sections = toPublicProfileSections(
      [
        populated('credentials', { id: 'a', sort_order: 0 }),
        populated('metrics', { id: 'b', sort_order: 0 }),
        populated('expertise', { id: 'c', sort_order: 0 }),
      ],
      'en',
    )

    expect(sections.map(section => section.kind)).toEqual(['metrics', 'expertise', 'credentials'])
  })

  it('omits sections that resolved to nothing', () => {
    const sections = toPublicProfileSections(
      [
        populated('expertise', { id: 'a' }),
        row({ kind: 'credentials', id: 'b', payload: { items: [] } }),
      ],
      'en',
    )

    expect(sections.map(section => section.kind)).toEqual(['expertise'])
  })
})
