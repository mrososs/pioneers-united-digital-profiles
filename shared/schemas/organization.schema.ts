import { z } from 'zod'
import {
  optionalEmailSchema,
  optionalPhoneSchema,
  optionalSafeUrlSchema,
  optionalStoragePathSchema,
  optionalText,
  requiredText,
  slugSchema,
} from '#shared/schemas/common.schema'

/** Company information shown on the company Digital Profile and in vCards. */
export const organizationWriteSchema = z.object({
  nameEn: requiredText(160),
  nameAr: requiredText(160),
  slug: slugSchema,
  website: optionalSafeUrlSchema,
  email: optionalEmailSchema,
  phone: optionalPhoneSchema,
  addressEn: optionalText(400),
  addressAr: optionalText(400),
  taglineEn: optionalText(200),
  taglineAr: optionalText(200),
  logoPath: optionalStoragePathSchema,
})

export const organizationUpdateSchema = organizationWriteSchema
  .partial()
  .refine(value => Object.keys(value).length > 0, { message: 'validation.emptyUpdate' })

export type OrganizationWriteInput = z.infer<typeof organizationWriteSchema>
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>
