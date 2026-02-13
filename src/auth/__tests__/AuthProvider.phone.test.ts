import { describe, expect, it } from 'vitest'

import { buildCognitoPhoneUpdateAttributes, buildCognitoSignUpAttributes } from '@/auth/AuthProvider'

describe('AuthProvider Cognito phone attribute helpers', () => {
  it('builds required signup attributes including phone_number and updated_at', () => {
    const attributes = buildCognitoSignUpAttributes('Harry Tu', 'harry@example.com', '+14155550100')

    expect(attributes.email).toBe('harry@example.com')
    expect(attributes.name).toBe('Harry Tu')
    expect(attributes.phone_number).toBe('+14155550100')
    expect(attributes.updated_at).toMatch(/^\d+$/)
  })

  it('builds phone update attributes including updated_at', () => {
    const attributes = buildCognitoPhoneUpdateAttributes('+14155550101')

    expect(attributes.phone_number).toBe('+14155550101')
    expect(attributes.updated_at).toMatch(/^\d+$/)
  })
})
