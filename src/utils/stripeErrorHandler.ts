import { t } from '@/utils/i18n'

export interface PaymentError {
  type: 'card_error' | 'validation_error' | 'api_error' | 'rate_limit_error' | 'network_error'
  code?: string
  message: string
  statusCode: number
  retryable: boolean
  userMessage: string
  action?: 'retry' | 'contact_support' | 'update_card' | 'try_different_plan'
}

/**
 * Map Stripe error codes to user-friendly, internationalized error messages
 * Based on Stripe error documentation: https://stripe.com/docs/error-codes
 */
export function handleStripeError(error: unknown): PaymentError {
  // Default error structure
  const defaultError: PaymentError = {
    type: 'api_error',
    message: 'An unknown error occurred',
    statusCode: 500,
    retryable: true,
    userMessage: t('settings.payment.errors.unknownError'),
    action: 'retry',
  }

  // Handle TypeError (network errors)
  if (error instanceof TypeError) {
    return {
      type: 'network_error',
      message: error.message,
      statusCode: 0,
      retryable: true,
      userMessage: t('settings.payment.errors.networkError'),
      action: 'retry',
    }
  }

  // Handle API error responses
  if (typeof error === 'object' && error !== null) {
    const err = error as any

    // Extract error type and code
    const errorType = err.type || err.error?.type || 'api_error'
    const errorCode = err.code || err.error?.code
    const errorMessage = err.message || err.error?.message || 'An error occurred'
    const statusCode = err.statusCode || err.status || 500

    // Map error codes to user-friendly messages
    return mapStripeErrorCode(errorType, errorCode, errorMessage, statusCode)
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      ...defaultError,
      message: error,
      userMessage: error,
    }
  }

  return defaultError
}

/**
 * Map specific Stripe error codes to user-friendly messages
 */
function mapStripeErrorCode(
  type: string,
  code: string | undefined,
  message: string,
  statusCode: number
): PaymentError {
  // Card declined errors
  if (type === 'card_error' || type === 'invalid_request_error') {
    switch (code) {
      case 'card_declined':
        return {
          type: 'card_error',
          code,
          message,
          statusCode,
          retryable: false,
          userMessage: t('settings.payment.errors.cardDeclined'),
          action: 'update_card',
        }

      case 'insufficient_funds':
        return {
          type: 'card_error',
          code,
          message,
          statusCode,
          retryable: false,
          userMessage: t('settings.payment.errors.insufficientFunds'),
          action: 'update_card',
        }

      case 'expired_card':
        return {
          type: 'card_error',
          code,
          message,
          statusCode,
          retryable: false,
          userMessage: t('settings.payment.errors.expiredCard'),
          action: 'update_card',
        }

      case 'incorrect_cvc':
        return {
          type: 'card_error',
          code,
          message,
          statusCode,
          retryable: true,
          userMessage: t('settings.payment.errors.incorrectCvc'),
          action: 'retry',
        }

      case 'incorrect_number':
        return {
          type: 'card_error',
          code,
          message,
          statusCode,
          retryable: false,
          userMessage: t('settings.payment.errors.cardDeclined'),
          action: 'update_card',
        }

      case 'invalid_expiry_year':
      case 'invalid_expiry_month':
        return {
          type: 'card_error',
          code,
          message,
          statusCode,
          retryable: false,
          userMessage: t('settings.payment.errors.expiredCard'),
          action: 'update_card',
        }

      case 'processing_error':
        return {
          type: 'card_error',
          code,
          message,
          statusCode,
          retryable: true,
          userMessage: t('settings.payment.errors.processingError'),
          action: 'retry',
        }

      default:
        return {
          type: 'card_error',
          code,
          message,
          statusCode,
          retryable: true,
          userMessage: t('settings.payment.errors.unknownError'),
          action: 'contact_support',
        }
    }
  }

  // Rate limit errors
  if (type === 'rate_limit_error' || code === 'rate_limit') {
    return {
      type: 'rate_limit_error',
      code,
      message,
      statusCode,
      retryable: true,
      userMessage: t('settings.payment.errors.rateLimitError'),
      action: 'retry',
    }
  }

  // Validation errors
  if (type === 'validation_error' || type === 'invalid_request_error') {
    return {
      type: 'validation_error',
      code,
      message,
      statusCode,
      retryable: false,
      userMessage: message,
      action: 'retry',
    }
  }

  // API errors
  if (type === 'api_error') {
    return {
      type: 'api_error',
      code,
      message,
      statusCode,
      retryable: statusCode >= 500,
      userMessage: t('settings.payment.errors.processingError'),
      action: statusCode >= 500 ? 'retry' : 'contact_support',
    }
  }

  // Default fallback
  return {
    type: 'api_error',
    code,
    message,
    statusCode,
    retryable: statusCode >= 500,
    userMessage: t('settings.payment.errors.unknownError'),
    action: 'retry',
  }
}

/**
 * Determine if an error is retryable based on status code
 */
export function isRetryableError(statusCode: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(statusCode)
}

/**
 * Get the suggested action for a payment error
 */
export function getErrorAction(error: PaymentError): PaymentError['action'] {
  return error.action || 'retry'
}
