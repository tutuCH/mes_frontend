import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAccessToken, setAccessTokenProvider } from '@/services/apiClient'

describe('apiClient token provider', () => {
  beforeEach(() => {
    setAccessTokenProvider(async () => null)
  })

  it('returns null when no provider token exists', async () => {
    await expect(getAccessToken()).resolves.toBeNull()
  })

  it('uses latest provider to resolve token', async () => {
    const provider = vi.fn(async () => 'token-123')
    setAccessTokenProvider(provider)

    await expect(getAccessToken()).resolves.toBe('token-123')
    expect(provider).toHaveBeenCalledTimes(1)
  })

  it('swallows provider errors and returns null', async () => {
    setAccessTokenProvider(async () => {
      throw new Error('provider boom')
    })

    await expect(getAccessToken()).resolves.toBeNull()
  })
})
