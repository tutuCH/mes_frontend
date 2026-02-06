import { describe, expect, test } from 'vitest'
import { shouldEnableIosViewportFix } from '@/utils/iosViewport'

describe('shouldEnableIosViewportFix', () => {
  test('returns true for iOS Safari with visual viewport', () => {
    const userAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

    expect(
      shouldEnableIosViewportFix({
        userAgent,
        hasVisualViewport: true,
      }),
    ).toBe(true)
  })

  test('returns false for iOS Safari without visual viewport', () => {
    const userAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

    expect(
      shouldEnableIosViewportFix({
        userAgent,
        hasVisualViewport: false,
      }),
    ).toBe(false)
  })

  test('returns false for iOS Chrome', () => {
    const userAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0.0.0 Mobile/15E148 Safari/604.1'

    expect(
      shouldEnableIosViewportFix({
        userAgent,
        hasVisualViewport: true,
      }),
    ).toBe(false)
  })
})
