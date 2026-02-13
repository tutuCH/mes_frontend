import { z } from 'zod'

// Common password requirements
const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
}

// Password validation schema with detailed error messages
export const passwordSchema = z
  .string()
  .min(passwordRequirements.minLength, `Password must be at least ${passwordRequirements.minLength} characters`)
  .refine(
    (password) => !passwordRequirements.requireUppercase || /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => !passwordRequirements.requireLowercase || /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => !passwordRequirements.requireNumber || /[0-9]/.test(password),
    'Password must contain at least one number'
  )
  .refine(
    (password) => !passwordRequirements.requireSpecial || /[@$!%*?&]/.test(password),
    'Password must contain at least one special character (@$!%*?&)'
  )

// Email validation schema
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required')

// Phone validation schema (strict E.164 format)
export const e164PhoneRegex = /^\+[1-9]\d{7,14}$/
export const phoneSchema = z
  .string()
  .regex(e164PhoneRegex, 'Phone number must be in E.164 format (e.g. +14155550100)')

// Name validation schema
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')

// Login form schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

// Sign up form schema
export const signUpSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phoneNumber: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// Forgot password form schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

// Reset password form schema
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// Type exports for form data
export type LoginFormData = z.infer<typeof loginSchema>
export type SignUpFormData = z.infer<typeof signUpSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

// Password strength calculator
export function calculatePasswordStrength(password: string): {
  score: number
  label: 'weak' | 'fair' | 'good' | 'strong'
  checks: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    number: boolean
    special: boolean
  }
} {
  const checks = {
    length: password.length >= passwordRequirements.minLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[@$!%*?&]/.test(password),
  }

  const score = Object.values(checks).filter(Boolean).length

  let label: 'weak' | 'fair' | 'good' | 'strong'
  if (score <= 2) {
    label = 'weak'
  } else if (score === 3) {
    label = 'fair'
  } else if (score === 4) {
    label = 'good'
  } else {
    label = 'strong'
  }

  return { score, label, checks }
}

// Common password list (simplified - in production, use a more comprehensive list)
const commonPasswords = [
  'password',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'password1',
  'admin',
  'letmein',
  'welcome',
  'monkey',
]

export function isCommonPassword(password: string): boolean {
  return commonPasswords.includes(password.toLowerCase())
}

export function isValidE164Phone(phoneNumber: string): boolean {
  return phoneSchema.safeParse(phoneNumber).success
}

// Sanitize user input (basic XSS prevention)
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
