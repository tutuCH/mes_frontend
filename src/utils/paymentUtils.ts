/**
 * Payment utility functions for Stripe integration
 * Handles idempotency, URL building, metadata, and query param parsing
 */

/**
 * Generate a unique idempotency key for Stripe requests
 * Uses UUID v4 format for uniqueness
 */
export function generateIdempotencyKey(): string {
  // Simple UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Build checkout success and cancel URLs with proper base
 */
export function buildCheckoutUrls(
  baseUrl: string = window.location.origin
): { successUrl: string; cancelUrl: string } {
  const path = '/settings'

  return {
    successUrl: `${baseUrl}${path}?payment=success`,
    cancelUrl: `${baseUrl}${path}?payment=canceled`,
  }
}

/**
 * Generate metadata for Stripe checkout sessions
 * Useful for debugging and linking Stripe objects to your database
 */
export function generateCheckoutMetadata(
  planId: string,
  userId?: string | number,
  additionalMetadata?: Record<string, string>
): Record<string, string> {
  const metadata: Record<string, string> = {
    planId,
    timestamp: new Date().toISOString(),
    source: 'mes-dashboard-frontend',
    ...additionalMetadata,
  }

  if (userId !== undefined) {
    metadata.userId = String(userId)
  }

  return metadata
}

/**
 * Parse payment query params from URL after Stripe checkout
 * Returns the payment status if present
 */
export function parsePaymentQueryParams(): 'success' | 'canceled' | null {
  if (typeof window === 'undefined') return null

  const params = new URLSearchParams(window.location.search)
  const paymentStatus = params.get('payment')

  if (paymentStatus === 'success' || paymentStatus === 'canceled') {
    return paymentStatus
  }

  return null
}

/**
 * Clean payment query params from URL
 * Call this after processing the payment status
 */
export function cleanPaymentQueryParams(): void {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  url.searchParams.delete('payment')

  // Update URL without page reload
  window.history.replaceState({}, '', url.toString())
}

/**
 * Get current user ID from auth token or profile
 * This is a simplified version - you may want to decode the JWT or fetch from profile
 */
export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null

  // Try to get from localStorage (assuming user info is stored there)
  const userInfo = localStorage.getItem('user_info')
  if (userInfo) {
    try {
      const user = JSON.parse(userInfo)
      return user.userId?.toString() || user.id?.toString() || null
    } catch {
      // Ignore parse errors
    }
  }

  // Try to decode from JWT (simplified)
  const token = localStorage.getItem('auth_token')
  if (token) {
    try {
      // JWT is base64url encoded, need to decode the payload
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        return payload.userId?.toString() || payload.sub?.toString() || null
      }
    } catch {
      // Ignore decode errors
    }
  }

  return null
}

/**
 * Format currency amount with proper symbol and decimals
 */
export function formatCurrency(
  amount: number,
  currency: string = 'usd',
  locale: string = 'en-US'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100) // Stripe amounts are in cents
  } catch {
    // Fallback if currency is invalid
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

/**
 * Format date to localized string
 */
export function formatDate(
  dateString: string,
  locale: string = 'en-US'
): string {
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  } catch {
    return dateString
  }
}

/**
 * Calculate days remaining until a date
 */
export function daysUntil(dateString: string): number {
  const targetDate = new Date(dateString)
  const today = new Date()
  const diffTime = targetDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Check if a subscription is in trial period
 */
export function isInTrial(subscription: {
  trialEnd?: string | null
  status: string
}): boolean {
  return (
    subscription.status === 'trialing' &&
    subscription.trialEnd !== null &&
    subscription.trialEnd !== undefined &&
    new Date(subscription.trialEnd) > new Date()
  )
}

/**
 * Check if a subscription is active
 */
export function isActiveSubscription(subscription: {
  status: string
}): boolean {
  return ['active', 'trialing'].includes(subscription.status)
}

/**
 * Check if a subscription is canceled but still active until period end
 */
export function isCanceledSubscription(subscription: {
  cancelAtPeriodEnd: boolean | null | undefined
  status: string
}): boolean {
  return (
    (subscription.cancelAtPeriodEnd === true ||
      subscription.status === 'canceled') &&
    isActiveSubscription(subscription)
  )
}

/**
 * Get subscription status badge variant
 */
export function getSubscriptionStatusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    trialing: 'secondary',
    canceled: 'secondary',
    past_due: 'destructive',
    unpaid: 'destructive',
    incomplete: 'outline',
    inactive: 'outline',
  }

  return variants[status] || 'outline'
}

/**
 * Validate plan ID format
 */
export function isValidPlanId(planId: string): boolean {
  // Plan IDs should be non-empty strings
  return typeof planId === 'string' && planId.length > 0
}

/**
 * Validate coupon code format
 */
export function isValidCouponCode(code: string): boolean {
  // Coupon codes should be alphanumeric with underscores, 1-50 chars
  return /^[A-Z0-9_]{1,50}$/i.test(code)
}

/**
 * Truncate sensitive data (e.g., card numbers)
 */
export function truncateCardNumber(last4: string): string {
  return `**** **** **** ${last4}`
}

/**
 * Mask email for privacy
 */
export function maskEmail(email: string): string {
  const [username, domain] = email.split('@')
  if (!domain) return email

  const visibleChars = Math.min(2, username.length)
  const masked = username.substring(0, visibleChars) + '*'.repeat(username.length - visibleChars)
  return `${masked}@${domain}`
}

/**
 * Generate a checkout session ID for tracking
 */
export function generateCheckoutSessionId(): string {
  return `checkout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
