import { describe, expect, it, vi } from 'vitest'

/**
 * Integration test for the public projection boundary.
 *
 * WHY THIS ONE MATTERS MOST
 *   `toPublicProfile` is the last thing that runs before data leaves the server for an
 *   anonymous visitor. If it ever gains a field it should not have — `status`,
 *   `organizationId`, `createdBy`, a raw storage path — that is a data-exposure bug that no
 *   type check would catch, because adding a property to an object is always valid.
 *
 *   The test therefore asserts on the EXACT key set, not just on the fields it wants
 *   present. A new leak fails the assertion.
 *
 * The URL helpers are mocked because they read Nitro runtime config, which does not exist
 * outside a request. Mocking them also makes the expected URLs deterministic.
 */

vi.mock('../../server/utils/urls', () => ({
  siteOrigin: () => 'https://profile.pioneersunited.com',
  profilePath: (locale: string, slug: string) => `/${locale}/${slug}`,
  profileUrl: (locale: string, slug: string) => `https://profile.pioneersunited.com/${locale}/${slug}`,
  profileAlternateUrls: (slug: string) => ({
    en: `https://profile.pioneersunited.com/en/${slug}`,
    ar: `https://profile.pioneersunited.com/ar/${slug}`,
  }),
  vcardUrl: (slug: string) => `https://profile.pioneersunited.com/api/profiles/${slug}/vcard`,
  qrUrl: (slug: string) => `https://profile.pioneersunited.com/api/profiles/${slug}/qr.svg`,
  publicStorageUrl: (bucket: string, key: string | null) =>
    (key ? `https://storage.test/object/public/${bucket}/${key}` : null),
}))

const { localised, toProfile, toPublicProfile } = await import('../../server/repositories/profile.mapper')

const organizationRow = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'pioneers-united',
  name_en: 'Pioneers United',
  name_ar: 'بيونيرز يونايتد',
  tagline_en: 'Building what comes next',
  tagline_ar: 'نبني ما هو قادم',
  website: 'https://pioneersunited.com',
  email: 'info@pioneersunited.test',
  phone: '+966555000000',
  address_en: 'Riyadh, Saudi Arabia',
  address_ar: 'الرياض، السعودية',
  logo_path: 'organizations/org/logo-1.svg',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const profileRow = {
  id: '44444444-4444-4444-8444-444444444444',
  organization_id: organizationRow.id,
  slug: 'sample-executive',
  profile_type: 'individual' as const,
  status: 'published' as const,
  name_en: 'Sample Executive',
  name_ar: 'نموذج تنفيذي',
  job_title_en: 'Chief Example Officer',
  job_title_ar: 'الرئيس التنفيذي للأمثلة',
  department_en: 'Corporate Development',
  department_ar: 'التطوير المؤسسي',
  bio_en: 'English biography.',
  bio_ar: 'نبذة بالعربية.',
  location_en: 'Riyadh, Saudi Arabia',
  location_ar: 'الرياض، السعودية',
  email: 'sample.executive@example.test',
  phone: '+966555000001',
  whatsapp: '+966555000001',
  linkedin_url: 'https://www.linkedin.com/in/example',
  website_url: 'https://pioneersunited.com',
  photo_path: 'profiles/44444444/photo-1.jpg',
  published_at: '2026-02-01T00:00:00.000Z',
  created_by: '22222222-2222-4222-8222-222222222222',
  updated_by: '22222222-2222-4222-8222-222222222222',
  created_at: '2026-01-15T00:00:00.000Z',
  updated_at: '2026-02-01T00:00:00.000Z',
}

const linkRows = [
  {
    id: 'link-2',
    profile_id: profileRow.id,
    type: 'x' as const,
    label_en: 'X',
    label_ar: 'إكس',
    url: 'https://x.com/example',
    sort_order: 1,
    enabled: true,
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'link-1',
    profile_id: profileRow.id,
    type: 'website' as const,
    label_en: 'Company website',
    label_ar: 'موقع الشركة',
    url: 'https://pioneersunited.com',
    sort_order: 0,
    enabled: true,
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'link-3',
    profile_id: profileRow.id,
    type: 'custom' as const,
    label_en: 'Hidden',
    label_ar: 'مخفي',
    url: 'https://example.test/hidden',
    sort_order: 2,
    enabled: false,
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
  },
]

describe('localised', () => {
  it('prefers the requested locale', () => {
    expect(localised('en', 'English', 'عربي')).toBe('English')
    expect(localised('ar', 'English', 'عربي')).toBe('عربي')
  })

  it('falls back to the other language when the preferred one is empty', () => {
    // A published profile with an untranslated job title should show the title it has,
    // not a blank line.
    expect(localised('ar', 'English only', null)).toBe('English only')
    expect(localised('ar', 'English only', '   ')).toBe('English only')
    expect(localised('en', null, 'عربي فقط')).toBe('عربي فقط')
  })

  it('returns null when neither language has content', () => {
    expect(localised('en', null, null)).toBeNull()
    expect(localised('en', '', '  ')).toBeNull()
  })
})

describe('toPublicProfile', () => {
  const publicProfile = toPublicProfile(profileRow, organizationRow, linkRows, 'en')

  it('exposes exactly the public field set and nothing more', () => {
    expect(Object.keys(publicProfile).sort()).toEqual([
      'alternateUrls',
      'bio',
      'bookingUrl',
      'canonicalUrl',
      'department',
      'email',
      'headline',
      'jobTitle',
      'linkedinUrl',
      'links',
      'locale',
      'location',
      'name',
      'organization',
      'phone',
      'photoUrl',
      'profileType',
      'sections',
      'slug',
      'updatedAt',
      'websiteUrl',
      'whatsapp',
    ])
  })

  it('omits internal bookkeeping', () => {
    const keys = Object.keys(publicProfile)

    for (const forbidden of ['status', 'organizationId', 'createdBy', 'updatedBy', 'photoPath', 'publishedAt', 'id']) {
      expect(keys, `public profile must not expose "${forbidden}"`).not.toContain(forbidden)
    }
  })

  it('resolves text to the requested locale', () => {
    expect(publicProfile.name).toBe('Sample Executive')
    expect(publicProfile.jobTitle).toBe('Chief Example Officer')

    const arabic = toPublicProfile(profileRow, organizationRow, linkRows, 'ar')
    expect(arabic.name).toBe('نموذج تنفيذي')
    expect(arabic.jobTitle).toBe('الرئيس التنفيذي للأمثلة')
  })

  it('drops disabled links and orders the rest by sort_order', () => {
    expect(publicProfile.links.map(link => link.id)).toEqual(['link-1', 'link-2'])
  })

  it('resolves storage paths into absolute URLs', () => {
    expect(publicProfile.photoUrl).toBe('https://storage.test/object/public/profile-media/profiles/44444444/photo-1.jpg')
    expect(publicProfile.organization.logoUrl).toBe('https://storage.test/object/public/brand-assets/organizations/org/logo-1.svg')
  })

  it('provides a canonical URL and both hreflang alternates', () => {
    expect(publicProfile.canonicalUrl).toBe('https://profile.pioneersunited.com/en/sample-executive')
    expect(publicProfile.alternateUrls).toEqual({
      en: 'https://profile.pioneersunited.com/en/sample-executive',
      ar: 'https://profile.pioneersunited.com/ar/sample-executive',
    })
  })

  it('embeds a locale-resolved organization summary without its internal id', () => {
    expect(publicProfile.organization.name).toBe('Pioneers United')
    expect(Object.keys(publicProfile.organization)).not.toContain('id')
  })
})

describe('toProfile', () => {
  it('keeps the administrative fields the dashboard needs', () => {
    const profile = toProfile(profileRow, linkRows)

    expect(profile.status).toBe('published')
    expect(profile.organizationId).toBe(organizationRow.id)
    expect(profile.createdBy).toBe(profileRow.created_by)
    expect(profile.photoPath).toBe(profileRow.photo_path)
  })

  it('keeps disabled links visible to an administrator', () => {
    // The editor must be able to see and re-enable a hidden link.
    const profile = toProfile(profileRow, linkRows)

    expect(profile.links).toHaveLength(3)
    expect(profile.links.map(link => link.id)).toEqual(['link-1', 'link-2', 'link-3'])
  })
})
