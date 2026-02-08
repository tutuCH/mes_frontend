import { describe, expect, it } from 'vitest'

import { resolveLoginRedirectPath } from '@/pages/auth/loginRedirect'

describe('resolveLoginRedirectPath', () => {
  it('returns root when no redirect state is present', () => {
    expect(resolveLoginRedirectPath(undefined)).toBe('/')
    expect(resolveLoginRedirectPath(null)).toBe('/')
    expect(resolveLoginRedirectPath({})).toBe('/')
  })

  it('preserves pathname, search, and hash from protected-route redirect state', () => {
    expect(
      resolveLoginRedirectPath({
        from: {
          pathname: '/settings',
          search: '?tab=payment',
          hash: '#billing',
        },
      }),
    ).toBe('/settings?tab=payment#billing')
  })
})
