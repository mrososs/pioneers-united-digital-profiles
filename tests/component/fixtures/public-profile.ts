import type { PublicProfile } from '#shared/types/profile'

/**
 * A locale-resolved `PublicProfile`, shaped exactly as `/api/public/profiles/:slug`
 * returns one.
 *
 * Shared by the component tests so that a change to the DTO breaks them in one
 * place rather than in five slightly different inline literals — the drift
 * between hand-rolled fixtures is what lets a component keep passing against a
 * payload the server no longer sends.
 */
export function publicProfileFixture(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    slug: 'sample-executive',
    locale: 'en',
    profileType: 'individual',

    name: 'Sample Executive',
    jobTitle: 'Chief Example Officer',
    department: 'Executive Office',
    bio: 'Leads the commercial development portfolio.',
    location: 'Riyadh, Saudi Arabia',

    email: 'sample@pioneersunited.test',
    phone: '+966555000001',
    whatsapp: '+966555000001',
    linkedinUrl: 'https://www.linkedin.com/in/sample-executive',
    websiteUrl: 'https://pioneersunited.com',

    photoUrl: null,

    links: [
      {
        id: 'link-1',
        type: 'website',
        label: 'Corporate site',
        url: 'https://pioneersunited.com',
      },
    ],

    organization: {
      slug: 'pioneers-united',
      name: 'Pioneers United',
      tagline: 'Building what comes next',
      website: 'https://pioneersunited.com',
      address: 'Riyadh, Saudi Arabia',
      logoUrl: null,
    },

    canonicalUrl: 'https://profile.pioneersunited.com/en/sample-executive',
    alternateUrls: {
      en: 'https://profile.pioneersunited.com/en/sample-executive',
      ar: 'https://profile.pioneersunited.com/ar/sample-executive',
    },

    updatedAt: '2026-01-01T00:00:00.000Z',

    ...overrides,
  }
}
