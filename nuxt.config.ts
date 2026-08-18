import tailwindcss from '@tailwindcss/vite'

/**
 * Pioneers United Digital Profiles — Nuxt configuration.
 *
 * Directory layout follows the Nuxt 4 defaults: `app/` is the client source
 * directory, `server/` holds Nitro code and `shared/` holds code imported by
 * both through the `#shared/*` alias.
 */
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/supabase',
    '@nuxtjs/i18n',
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
  ],

  // Explicit filename-based component names (AppButton, ProfileIdentity, ...)
  // instead of directory-derived prefixes. Component file names already carry
  // their domain prefix, so path prefixing would only duplicate it.
  components: [
    { path: '~/components', pathPrefix: false },
  ],

  devtools: { enabled: true },

  app: {
    head: {
      // `lang` and `dir` are managed per-request by useLocaleHead() in app.vue.
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },

        // Design-system type stack: Archivo (Latin), IBM Plex Sans Arabic
        // (Arabic), IBM Plex Mono (slugs, URLs, IDs, printed figures).
        // Preconnect first — a public profile is opened from a QR scan on
        // mobile data, where the extra round trip to fonts.gstatic.com is the
        // single most expensive thing on the page.
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
        },
      ],

      script: [
        {
          // Sets `pu-motion` on <html> before first paint so the scroll-reveal
          // initial state in main.css applies without a flash of already-placed
          // content. Three properties matter and each is deliberate:
          //
          //   * it never runs for a visitor who asked for reduced motion, so
          //     that preference is honoured before a single byte of GSAP loads;
          //   * with JavaScript disabled the class is never set and every
          //     revealed element renders at its final state;
          //   * the failsafe removes the class if the motion plugin has not
          //     reported ready, so a GSAP chunk that fails to arrive degrades
          //     to a plain page instead of leaving the profile invisible.
          innerHTML: `(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var e=document.documentElement;e.classList.add('pu-motion');setTimeout(function(){if(!e.hasAttribute('data-motion-ready'))e.classList.remove('pu-motion')},2500)}catch(_){}})()`,
          tagPosition: 'head',
        },
      ],
    },

    // Surfaces are 240ms; a route change is a surface change. GSAP owns motion
    // inside a page, but the page-to-page crossfade is one CSS rule and does
    // not need a timeline.
    pageTransition: { name: 'pu-page', mode: 'out-in' },
    layoutTransition: false,
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    logLevel: 'info',

    // Server-only wallet credentials. Empty by default: the wallet services
    // report themselves as "not configured" rather than throwing.
    wallet: {
      apple: {
        teamIdentifier: '',
        passTypeIdentifier: '',
        certificateBase64: '',
        certificatePassword: '',
        wwdrCertificateBase64: '',
      },
      google: {
        issuerId: '',
        classSuffix: '',
        serviceAccountEmail: '',
        serviceAccountPrivateKey: '',
      },
    },

    public: {
      siteUrl: 'http://localhost:3000',
      defaultOrganizationSlug: 'pioneers-united',
    },
  },

  routeRules: {
    // Convenience redirects so an unprefixed /admin URL still lands somewhere
    // sensible. The canonical admin paths are /en/admin/** and /ar/admin/**.
    '/admin': { redirect: '/en/admin' },
    '/admin/**': { redirect: '/en/admin/**' },

    // The dashboard must never be indexed (see also public/robots.txt).
    '/en/admin/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow, noarchive' } },
    '/ar/admin/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow, noarchive' } },
    '/api/admin/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
  },

  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: '2026-08-17',

  nitro: {
    // Public profiles are cheap to render and highly cacheable; the admin area
    // and every API route stay dynamic (see `routeRules` below).
    compressPublicAssets: true,
  },

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  typescript: {
    strict: true,
    typeCheck: false, // run explicitly via `pnpm typecheck` to keep dev fast
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true,
        noImplicitOverride: true,
        noFallthroughCasesInSwitch: true,
        noImplicitReturns: true,
        forceConsistentCasingInFileNames: true,
      },
    },
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },

  i18n: {
    // `strategy: 'prefix'` keeps every public URL explicitly locale-scoped, so
    // a shared link always renders in the language it was shared in:
    //   /en/mohammed-alqahtani   /ar/mohammed-alqahtani
    strategy: 'prefix',
    defaultLocale: 'en',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', dir: 'ltr', file: 'en.json' },
      { code: 'ar', language: 'ar-SA', name: 'العربية', dir: 'rtl', file: 'ar.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'pu_locale',
      cookieCrossOrigin: false,
      alwaysRedirect: false,
      redirectOn: 'root',
      fallbackLocale: 'en',
    },
    // Absolute URLs for hreflang/canonical tags.
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },

  supabase: {
    // Authorization is enforced server-side (see server/utils/auth.ts) and by
    // Row Level Security. The module's blanket redirect is disabled so that the
    // locale-prefixed admin routes can own their own middleware.
    redirect: false,
    // Generated types live in `shared/` so that server, app and test code all reach them
    // through the same `#shared/types/database.types` path.
    types: '~~/shared/types/database.types.ts',
    cookieOptions: {
      maxAge: 60 * 60 * 8, // 8 hours
      sameSite: 'lax',
      secure: true,
    },
    clientOptions: {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    },
  },
})
