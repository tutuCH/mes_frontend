export type TimestampSelection = {
  x: number
  source: string
  raw: unknown
  timezoneInfo?: string
}

export type GapEvaluation = {
  deltaMs: number
  deltaMinutes: number
  shouldWarn: boolean
}

type DebugLogger = {
  debug: (...args: unknown[]) => void
}

type SelectionOptions = {
  sourceHint: string
  debug?: boolean
  logger?: DebugLogger
}

const TIMEZONE_REGEX = /([zZ]|[+-]\d{2}:?\d{2})$/
const SPACE_TIME_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/
const ISO_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

function normalizeNumericTimestamp(value: number, logger?: DebugLogger): number {
  if (!Number.isFinite(value)) return Number.NaN
  // Detect seconds vs milliseconds: seconds are typically < 1e12
  const isSeconds = value < 1e12
  const result = isSeconds ? value * 1000 : value
  if (logger) {
    logger.debug('Timestamp numeric normalization', {
      input: value,
      isSeconds,
      result: new Date(result).toISOString(),
    })
  }
  return result
}

function normalizeTimestampString(value: string, logger?: DebugLogger): number {
  const trimmed = value.trim()
  if (!trimmed) return Number.NaN

  // Check if it has explicit timezone info
  const hasExplicitTimezone = TIMEZONE_REGEX.test(trimmed)
  
  // Convert space-separated to ISO format (2024-01-15 10:30:00 -> 2024-01-15T10:30:00)
  const normalized = SPACE_TIME_REGEX.test(trimmed)
    ? trimmed.replace(' ', 'T')
    : trimmed

  const isSpaceSeparated = normalized !== trimmed
  
  // Determine if we need to assume UTC
  // Only assume UTC if:
  // 1. No explicit timezone provided
  // 2. It's an ISO format datetime (has 'T')
  const needsUtcAssumption = !hasExplicitTimezone && ISO_TIME_REGEX.test(normalized)
  
  // Add Z only if we're assuming UTC for an ISO datetime without timezone
  const withZone = needsUtcAssumption ? `${normalized}Z` : normalized

  const parsed = Date.parse(withZone)
  
  if (logger) {
    logger.debug('Timestamp string normalization', {
      original: value,
      normalized,
      withZone,
      hasExplicitTimezone,
      isSpaceSeparated,
      needsUtcAssumption,
      parsed: Number.isFinite(parsed) ? new Date(parsed).toISOString() : 'INVALID',
    })
  }
  
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function normalizeCandidate(value: unknown, logger?: DebugLogger): { value: number; timezoneInfo: string } {
  if (typeof value === 'number') {
    const normalized = normalizeNumericTimestamp(value, logger)
    return { 
      value: normalized, 
      timezoneInfo: 'numeric-timestamp' 
    }
  }
  
  if (typeof value === 'string') {
    // Check if it's a numeric string
    const asNumber = Number(value)
    if (!Number.isNaN(asNumber) && value.trim() !== '') {
      const normalized = normalizeNumericTimestamp(asNumber, logger)
      return { 
        value: normalized, 
        timezoneInfo: 'numeric-string' 
      }
    }
    
    // Parse as timestamp string
    const hasTimezone = TIMEZONE_REGEX.test(value.trim())
    const normalized = normalizeTimestampString(value, logger)
    return { 
      value: normalized, 
      timezoneInfo: hasTimezone ? 'explicit-timezone' : 'assumed-utc' 
    }
  }
  
  return { value: Number.NaN, timezoneInfo: 'invalid-type' }
}

export function selectEventTimestamp(event: unknown, options: SelectionOptions): TimestampSelection {
  const candidateMap: Array<{ source: string; value: unknown }> = []
  const record = event as Record<string, any> | null

  if (record) {
    candidateMap.push({ source: 'data.timestamp', value: record.data?.timestamp })
    candidateMap.push({ source: 'data.sendStamp', value: record.data?.sendStamp })
    candidateMap.push({ source: 'timestamp', value: record.timestamp })
    candidateMap.push({ source: 'data._time', value: record.data?._time })
    candidateMap.push({ source: 'data.time', value: record.data?.time })
    candidateMap.push({ source: 'data.Data.timestamp', value: record.data?.Data?.timestamp })
  }

  for (const candidate of candidateMap) {
    const { value: x, timezoneInfo } = normalizeCandidate(candidate.value, options.debug ? options.logger : undefined)
    if (Number.isFinite(x)) {
      if (options.debug && options.logger) {
        options.logger.debug('SSE timestamp selection', {
          sourceHint: options.sourceHint,
          source: candidate.source,
          raw: candidate.value,
          x,
          xISO: new Date(x).toISOString(),
          timezoneInfo,
        })
      }
      return { x, source: candidate.source, raw: candidate.value, timezoneInfo }
    }
  }

  if (options.debug && options.logger) {
    options.logger.debug('SSE timestamp selection failed', {
      sourceHint: options.sourceHint,
      candidates: candidateMap.map(candidate => candidate.source),
      rawEvent: record,
    })
  }

  return { x: Number.NaN, source: 'none', raw: undefined, timezoneInfo: 'none' }
}

export function evaluateGapDelta(
  lastX: number | null,
  nextX: number,
  thresholdMs: number
): GapEvaluation | null {
  if (lastX === null) return null
  if (!Number.isFinite(lastX) || !Number.isFinite(nextX)) return null

  const deltaMs = nextX - lastX
  return {
    deltaMs,
    deltaMinutes: deltaMs / 60000,
    shouldWarn: deltaMs > thresholdMs,
  }
}

/**
 * Format a timestamp for display with explicit timezone information
 */
export function formatTimestampDebug(x: number): string {
  if (!Number.isFinite(x)) return 'INVALID'
  const date = new Date(x)
  return `${date.toISOString()} (UTC) / ${date.toString()} (Local)`
}
