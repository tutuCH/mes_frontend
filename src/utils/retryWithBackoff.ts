/**
 * Retry utility with exponential backoff and jitter
 * Implements Stripe best practices for retrying failed requests
 */

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  jitter?: boolean
  onRetry?: (attempt: number, error: Error) => void
  shouldRetry?: (error: Error) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  jitter: true, // Add randomness to prevent thundering herd
  onRetry: () => {},
  shouldRetry: () => true,
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
  jitter: boolean
): number {
  // Exponential backoff: delay * (multiplier ^ attempt)
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt)

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelay)

  // Add jitter to prevent thundering herd problem
  if (jitter) {
    // Add random delay between 0-50% of the current delay
    const jitterAmount = cappedDelay * 0.5 * Math.random()
    return cappedDelay + jitterAmount
  }

  return cappedDelay
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Function to retry (should return a Promise)
 * @param options - Retry configuration options
 * @returns Promise<T> - Result of the function
 * @throws Error - Last error if all retries are exhausted
 *
 * @example
 * ```ts
 * const result = await retryWithBackoff(
 *   () => api.checkout(),
 *   { maxRetries: 3, initialDelay: 1000 }
 * )
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Attempt the function
      const result = await fn()
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we should retry
      const isLastAttempt = attempt === opts.maxRetries
      if (isLastAttempt || !opts.shouldRetry(lastError)) {
        throw lastError
      }

      // Call onRetry callback
      opts.onRetry(attempt + 1, lastError)

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier,
        opts.jitter
      )

      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed')
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry only for specific HTTP status codes
 */
export function shouldRetryStatusCode(statusCode: number): boolean {
  // Retry on:
  // - 408 Request Timeout
  // - 429 Too Many Requests
  // - 500 Internal Server Error
  // - 502 Bad Gateway
  // - 503 Service Unavailable
  // - 504 Gateway Timeout
  return [408, 429, 500, 502, 503, 504].includes(statusCode)
}

/**
 * Create a retry predicate for HTTP status codes
 */
export function createStatusCodeRetryPredicate(
  retryableStatusCodes: number[]
): RetryOptions['shouldRetry'] {
  return (error: Error) => {
    // Try to extract status code from error
    const match = error.message.match(/status (\d{3})/i)
    if (match) {
      const statusCode = parseInt(match[1], 10)
      return retryableStatusCodes.includes(statusCode)
    }

    // Default to true for unknown errors (better to retry than fail)
    return true
  }
}

/**
 * Retry decorator for async methods
 *
 * @example
 * ```ts
 * class MyService {
 *   @retryable({ maxRetries: 3 })
 *   async fetchData() {
 *     // This will be retried up to 3 times on failure
 *   }
 * }
 * ```
 */
export function retryable(options: RetryOptions = {}) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      return retryWithBackoff(() => originalMethod.apply(this, args), options)
    }

    return descriptor
  }
}
