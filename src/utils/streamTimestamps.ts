export type TimestampSelection = {
  x: number
  source: string
  raw: unknown
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

function normalizeNumericTimestamp(value: number): number {
  if (!Number.isFinite(value)) return Number.NaN
  return value < 1e12 ? value * 1000 : value
}

function normalizeTimestampString(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) return Number.NaN

  const normalized = SPACE_TIME_REGEX.test(trimmed)
    ? trimmed.replace(' ', 'T')
    : trimmed

  const hasTimezone = TIMEZONE_REGEX.test(normalized)
  const needsUtc = !hasTimezone && normalized.includes('T')
  const withZone = needsUtc ? `${normalized}Z` : normalized

  const parsed = Date.parse(withZone)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function normalizeCandidate(value: unknown): number {
  if (typeof value === 'number') return normalizeNumericTimestamp(value)
  if (typeof value === 'string') {
    const asNumber = Number(value)
    if (!Number.isNaN(asNumber) && value.trim() !== '') {
      return normalizeNumericTimestamp(asNumber)
    }
    return normalizeTimestampString(value)
  }
  return Number.NaN
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
    const x = normalizeCandidate(candidate.value)
    if (Number.isFinite(x)) {
      if (options.debug && options.logger) {
        options.logger.debug('SSE timestamp selection', {
          sourceHint: options.sourceHint,
          source: candidate.source,
          raw: candidate.value,
          x,
        })
      }
      return { x, source: candidate.source, raw: candidate.value }
    }
  }

  if (options.debug && options.logger) {
    options.logger.debug('SSE timestamp selection failed', {
      sourceHint: options.sourceHint,
      candidates: candidateMap.map(candidate => candidate.source),
    })
  }

  return { x: Number.NaN, source: 'none', raw: undefined }
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
