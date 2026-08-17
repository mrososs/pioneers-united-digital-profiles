import { fileURLToPath } from 'node:url'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

/**
 * Two projects:
 *
 *   unit — plain Node environment. Services, schemas and pure utilities. Fast,
 *          no Nuxt bootstrap, no network, no database.
 *   nuxt — Nuxt runtime environment provided by @nuxt/test-utils. Component
 *          tests that need auto-imports, i18n and the Vue runtime.
 */
export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'tests/unit/**/*.spec.ts',
            'tests/integration/**/*.spec.ts',
          ],
        },
        resolve: {
          alias: {
            '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
          },
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          environment: 'nuxt',
          include: ['tests/component/**/*.spec.ts'],
        },
      }),
    ],
  },
})
