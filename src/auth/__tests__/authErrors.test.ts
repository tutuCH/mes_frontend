import { describe, expect, it } from 'vitest'

import { mapAuthErrorMessage } from '@/auth/authErrors'

describe('mapAuthErrorMessage', () => {
  it('maps known Cognito errors to user-safe translation keys', () => {
    expect(mapAuthErrorMessage({ name: 'UserNotConfirmedException' })).toBe('auth.errors.userNotConfirmed')
    expect(mapAuthErrorMessage({ name: 'CodeMismatchException' })).toBe('auth.errors.codeMismatch')
    expect(mapAuthErrorMessage({ name: 'TooManyRequestsException' })).toBe('auth.errors.tooManyRequests')
  })

  it('returns fallback key for unknown errors', () => {
    expect(mapAuthErrorMessage({ name: 'SomethingElse' })).toBe('auth.errors.generic')
  })
})
