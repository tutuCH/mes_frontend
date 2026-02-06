import { describe, expect, test } from 'vitest'
import { getToastMobileOffsets, getToastOffsets, TOAST_TOP_OFFSET } from '@/utils/toastOffsets'

describe('toast offsets', () => {
  test('returns expected top offset string', () => {
    expect(TOAST_TOP_OFFSET).toBe('calc(env(safe-area-inset-top) + 72px)')
  })

  test('returns desktop offsets', () => {
    expect(getToastOffsets()).toEqual({
      top: 'calc(env(safe-area-inset-top) + 72px)',
      right: 16,
    })
  })

  test('returns mobile offsets', () => {
    expect(getToastMobileOffsets()).toEqual({
      top: 'calc(env(safe-area-inset-top) + 72px)',
      left: 16,
      right: 16,
    })
  })
})
