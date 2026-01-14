/**
 * Environment-aware logger utility
 * Only logs in development mode, disabled in production
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

const isDevelopment = import.meta.env.DEV
const isTest = import.meta.env.MODE === 'test'

/**
 * Determine if logging should be enabled
 */
function shouldLog(): boolean {
  return isDevelopment || isTest
}

/**
 * Sanitize sensitive data from logs
 */
function sanitize(data: unknown): unknown {
  if (typeof data === 'string') {
    // Remove potential tokens and sensitive data
    return data.replace(/Bearer\s+[A-Za-z0-9-._~+/]+=*/gi, 'Bearer [REDACTED]')
      .replace(/token["\s:]+["\s]*[A-Za-z0-9-._~+/]+=*/gi, 'token: [REDACTED]')
      .replace(/password["\s:]+["\s]*[^,\s}]+/gi, 'password: [REDACTED]')
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data }
    // Remove sensitive keys
    const sensitiveKeys = ['token', 'password', 'accessToken', 'refreshToken', 'authToken', 'apiKey']
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        ;(sanitized as Record<string, unknown>)[key] = '[REDACTED]'
      }
    }
    return sanitized
  }

  return data
}

/**
 * Format log prefix with timestamp
 */
function formatPrefix(level: LogLevel): string {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1)
  return `[${timestamp}] [${level.toUpperCase()}]`
}

/**
 * Logger class with environment-aware logging
 */
class Logger {
  private log(level: LogLevel, args: unknown[]): void {
    if (!shouldLog()) return

    const sanitizedArgs = args.map(sanitize)
    const prefix = formatPrefix(level)

    console[level](prefix, ...sanitizedArgs)
  }

  /** Standard log message */
  log(...args: unknown[]): void {
    this.log('log', args)
  }

  /** Info level message */
  info(...args: unknown[]): void {
    this.log('info', args)
  }

  /** Warning message */
  warn(...args: unknown[]): void {
    this.log('warn', args)
  }

  /** Error message (always logged, even in production for errors) */
  error(...args: unknown[]): void {
    // Errors should always be logged, but still sanitize
    const sanitizedArgs = args.map(sanitize)
    const prefix = formatPrefix('error')
    console.error(prefix, ...sanitizedArgs)
  }

  /** Debug message (development only) */
  debug(...args: unknown[]): void {
    if (!isDevelopment) return
    this.log('debug', args)
  }

  /**
   * Create a scoped logger with a prefix
   */
  scoped(scope: string): ScopedLogger {
    return new ScopedLogger(scope)
  }
}

/**
 * Scoped logger with automatic prefix for specific modules
 */
class ScopedLogger {
  constructor(private scope: string) {}

  private formatMessage(message: string): string {
    return `[${this.scope}] ${message}`
  }

  log(...args: unknown[]): void {
    logger.log(this.formatMessage(args[0] as string), ...args.slice(1))
  }

  info(...args: unknown[]): void {
    logger.info(this.formatMessage(args[0] as string), ...args.slice(1))
  }

  warn(...args: unknown[]): void {
    logger.warn(this.formatMessage(args[0] as string), ...args.slice(1))
  }

  error(...args: unknown[]): void {
    logger.error(this.formatMessage(args[0] as string), ...args.slice(1))
  }

  debug(...args: unknown[]): void {
    logger.debug(this.formatMessage(args[0] as string), ...args.slice(1))
  }
}

// Export singleton instance
export const logger = new Logger()

// Export convenience function for creating scoped loggers
export function createLogger(scope: string): ScopedLogger {
  return logger.scoped(scope)
}

// Export default logger for easy importing
export default logger
