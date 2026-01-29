import { describe, expect, it, vi } from 'vitest'

import { selectEventTimestamp } from '@/utils/streamTimestamps'

describe('selectEventTimestamp', () => {
  it('uses numeric data.timestamp when provided (ms)', () => {
    const event = {
      timestamp: '2026-01-29T20:29:08.577Z',
      data: { timestamp: 1769718546425 },
    }

    const result = selectEventTimestamp(event, { sourceHint: 'spc-update' })

    expect(result.x).toBe(1769718546425)
    expect(result.source).toBe('data.timestamp')
  })

  it('converts numeric seconds to ms when needed', () => {
    const event = { timestamp: 1769718546 }

    const result = selectEventTimestamp(event, { sourceHint: 'realtime-update' })

    expect(result.x).toBe(1769718546000)
    expect(result.source).toBe('timestamp')
  })

  it('parses ISO timestamps with Z consistently', () => {
    const event = { timestamp: '2026-01-29T20:15:33.166Z' }

    const result = selectEventTimestamp(event, { sourceHint: 'spc-update' })

    expect(result.x).toBe(Date.parse('2026-01-29T20:15:33.166Z'))
  })

  it('parses space-separated timestamps as UTC', () => {
    const event = { data: { time: '2026-01-29 20:29:06' } }

    const result = selectEventTimestamp(event, { sourceHint: 'spc-update' })

    expect(result.x).toBe(Date.parse('2026-01-29T20:29:06Z'))
    expect(result.source).toBe('data.time')
  })

  it('logs selection metadata when debug enabled', () => {
    const logger = { debug: vi.fn() }
    const event = { timestamp: '2026-01-29T20:29:08.577Z' }

    selectEventTimestamp(event, {
      sourceHint: 'spc-update',
      debug: true,
      logger,
    })

    expect(logger.debug).toHaveBeenCalled()
  })
})
