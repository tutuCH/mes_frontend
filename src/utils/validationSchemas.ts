/**
 * Zod validation schemas for API requests
 * Provides client-side input validation before sending to backend
 */

import { z } from 'zod'

/**
 * Email validation schema
 */
export const emailSchema = z.string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .max(254, 'Email is too long')
  .toLowerCase()

/**
 * Password validation schema
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

/**
 * Name validation schema
 */
export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s\u4e00-\u9fff\u3400-\u4dbf-]+$/, 'Name contains invalid characters')
  .trim()

/**
 * Factory name validation schema
 */
export const factoryNameSchema = z.string()
  .min(1, 'Factory name is required')
  .max(100, 'Factory name is too long')
  .trim()

/**
 * Machine name/deviceId validation schema
 */
export const machineNameSchema = z.string()
  .min(1, 'Machine name is required')
  .max(50, 'Machine name is too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Machine name can only contain letters, numbers, hyphens, and underscores')
  .trim()

/**
 * Machine IP address validation schema
 */
export const ipAddressSchema = z.string()
  .min(1, 'IP address is required')
  .regex(
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/,
    'Invalid IPv4 address'
  )

/**
 * Login request validation schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
})

/**
 * Sign up request validation schema
 */
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

/**
 * Forgot password request validation schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

/**
 * Reset password request validation schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

/**
 * Change password request validation schema
 */
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

/**
 * Update profile request validation schema
 */
export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
})

/**
 * Create factory request validation schema
 */
export const createFactorySchema = z.object({
  name: factoryNameSchema,
  description: z.string().max(500, 'Description is too long').optional(),
  rows: z.number().int().min(1, 'Rows must be at least 1').max(20, 'Rows cannot exceed 20'),
  columns: z.number().int().min(1, 'Columns must be at least 1').max(20, 'Columns cannot exceed 20'),
})

/**
 * Update factory request validation schema
 */
export const updateFactorySchema = z.object({
  name: factoryNameSchema.optional(),
  description: z.string().max(500, 'Description is too long').optional(),
  rows: z.number().int().min(1, 'Rows must be at least 1').max(20, 'Rows cannot exceed 20').optional(),
  columns: z.number().int().min(1, 'Columns must be at least 1').max(20, 'Columns cannot exceed 20').optional(),
})

/**
 * Create machine request validation schema
 */
export const createMachineSchema = z.object({
  name: machineNameSchema,
  factoryId: z.number().int().positive('Factory ID must be a positive number'),
  row: z.number().int().min(0, 'Row must be 0 or greater'),
  column: z.number().int().min(0, 'Column must be 0 or greater'),
  machineType: z.string().max(50, 'Machine type is too long').optional(),
  ipAddress: ipAddressSchema.optional(),
  deviceId: machineNameSchema,
})

/**
 * Update machine request validation schema
 */
export const updateMachineSchema = z.object({
  name: machineNameSchema.optional(),
  row: z.number().int().min(0, 'Row must be 0 or greater').optional(),
  column: z.number().int().min(0, 'Column must be 0 or greater').optional(),
  machineType: z.string().max(50, 'Machine type is too long').optional(),
  ipAddress: ipAddressSchema.optional(),
})

/**
 * Create user request validation schema (admin)
 */
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  role: z.enum(['user', 'admin'] as const),
  permissions: z.array(z.string()).optional(),
})

/**
 * Update user request validation schema (admin)
 */
export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  role: z.enum(['user', 'admin']).optional(),
  permissions: z.array(z.string()).optional(),
})

/**
 * URL parameter validation schema
 */
export const urlParamSchema = z.string()
  .max(100, 'Parameter too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid parameter format')
  .transform((val) => val.trim())

/**
 * Token validation schema
 */
export const tokenSchema = z.string()
  .min(1, 'Token is required')
  .max(500, 'Token is too long')

/**
 * Plan ID validation schema (for payments)
 */
export const planIdSchema = z.string()
  .min(1, 'Plan ID is required')
  .max(100, 'Plan ID is too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid plan ID format')

/**
 * Coupon code validation schema
 */
export const couponCodeSchema = z.string()
  .max(50, 'Coupon code is too long')
  .regex(/^[A-Z0-9_]+$/i, 'Invalid coupon code format')
  .toUpperCase()
  .optional()

// Type exports
export type LoginInput = z.infer<typeof loginSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type CreateFactoryInput = z.infer<typeof createFactorySchema>
export type UpdateFactoryInput = z.infer<typeof updateFactorySchema>
export type CreateMachineInput = z.infer<typeof createMachineSchema>
export type UpdateMachineInput = z.infer<typeof updateMachineSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
