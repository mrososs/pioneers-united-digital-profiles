import { z } from 'zod'
import { LOCALE_CODES } from '#shared/constants/locales'
import { WALLET_PROVIDERS } from '#shared/constants/wallet'
import { optionalHexColorSchema, optionalStoragePathSchema, optionalText } from '#shared/schemas/common.schema'

/**
 * Branding. These values feed the semantic CSS custom properties defined in
 * app/assets/css/main.css, which is why they are colours and asset paths rather
 * than arbitrary CSS — a settings row must never be able to inject styles.
 */
export const brandingWriteSchema = z.object({
  primaryColor: optionalHexColorSchema,
  primaryForegroundColor: optionalHexColorSchema,
  accentColor: optionalHexColorSchema,
  logoPath: optionalStoragePathSchema,
  logoDarkPath: optionalStoragePathSchema,
  faviconPath: optionalStoragePathSchema,
  ogImagePath: optionalStoragePathSchema,
  defaultLocale: z.enum(LOCALE_CODES).optional(),
  footerNoteEn: optionalText(200),
  footerNoteAr: optionalText(200),
})

export const brandingUpdateSchema = brandingWriteSchema
  .partial()
  .refine(value => Object.keys(value).length > 0, { message: 'validation.emptyUpdate' })

/**
 * Integration settings hold NON-SECRET configuration only (whether a provider is
 * enabled, which class/template it writes to). Certificates, private keys and
 * service accounts live in environment variables — see docs/wallet.md.
 */
export const integrationSettingWriteSchema = z.object({
  provider: z.enum(WALLET_PROVIDERS),
  enabled: z.boolean(),
  config: z
    .record(z.string().max(64), z.union([z.string().max(512), z.boolean(), z.number()]))
    .default({})
    .refine(
      value => !Object.keys(value).some(key => /secret|password|private|token|certificate|credential/i.test(key)),
      { message: 'validation.noSecretsInConfig' },
    ),
})

export const integrationSettingsUpdateSchema = z.object({
  integrations: z.array(integrationSettingWriteSchema).max(10),
})

export type BrandingWriteInput = z.infer<typeof brandingWriteSchema>
export type BrandingUpdateInput = z.infer<typeof brandingUpdateSchema>
export type IntegrationSettingWriteInput = z.infer<typeof integrationSettingWriteSchema>
