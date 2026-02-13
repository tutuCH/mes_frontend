import { describe, expect, it } from 'vitest'

import { isValidE164Phone, signUpSchema } from '@/utils/validation'

describe('phone validation', () => {
  it('accepts valid E.164 phone numbers', () => {
    expect(isValidE164Phone('+14155550100')).toBe(true)
    expect(isValidE164Phone('+886912345678')).toBe(true)
  })

  it('rejects invalid phone numbers', () => {
    expect(isValidE164Phone('0912345678')).toBe(false)
    expect(isValidE164Phone('+0123456789')).toBe(false)
    expect(isValidE164Phone('+1234')).toBe(false)
  })

  it('requires phoneNumber on signup schema', () => {
    const result = signUpSchema.safeParse({
      name: 'Harry Tu',
      email: 'harry@example.com',
      password: 'H@rry981221',
      confirmPassword: 'H@rry981221',
      acceptTerms: true,
    })

    expect(result.success).toBe(false)
  })
})
