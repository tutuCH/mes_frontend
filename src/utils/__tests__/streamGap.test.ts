import { describe, expect, it } from 'vitest'

import { evaluateGapDelta } from '@/utils/streamTimestamps'

describe('evaluateGapDelta', () => {
  it('returns null when no historic timestamp is available', () => {
    const result = evaluateGapDelta(null, Date.now(), 120000)

    expect(result).toBeNull()
  })

  it('flags gaps above threshold', () => {
    const lastX = Date.parse('2026-01-29T20:15:33.166Z')
    const liveX = Date.parse('2026-01-29T20:29:06.000Z')

    const result = evaluateGapDelta(lastX, liveX, 2 * 60 * 1000)

    expect(result?.deltaMs).toBe(liveX - lastX)
    expect(result?.shouldWarn).toBe(true)
  })

  it('does not warn for small gaps', () => {
    const lastX = Date.parse('2026-01-29T20:15:33.166Z')
    const liveX = Date.parse('2026-01-29T20:16:10.000Z')

    const result = evaluateGapDelta(lastX, liveX, 2 * 60 * 1000)

    expect(result?.shouldWarn).toBe(false)
  })
})
