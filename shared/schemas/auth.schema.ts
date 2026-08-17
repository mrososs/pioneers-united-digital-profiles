import { z } from 'zod'
import { emailSchema } from '#shared/schemas/common.schema'

/**
 * Administrator authentication. Email + password against Supabase Auth.
 *
 * The password rules here are a client-side courtesy only — Supabase enforces
 * its own project-level password policy, which is the authority.
 */

export const PASSWORD_MIN_LENGTH = 12

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'validation.required' }),
})

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

export const passwordUpdateSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, { message: 'validation.passwordTooShort' })
      .max(128, { message: 'validation.tooLong' })
      .regex(/[a-z]/, { message: 'validation.passwordLowercase' })
      .regex(/[A-Z]/, { message: 'validation.passwordUppercase' })
      .regex(/\d/, { message: 'validation.passwordDigit' }),
    passwordConfirmation: z.string(),
  })
  .refine(value => value.password === value.passwordConfirmation, {
    message: 'validation.passwordMismatch',
    path: ['passwordConfirmation'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type PasswordUpdateInput = z.infer<typeof passwordUpdateSchema>
