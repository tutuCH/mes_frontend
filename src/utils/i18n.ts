import i18n from '@/i18n/config'

/**
 * Helper function to get translations outside React components.
 * Use this in services, utilities, or any non-React code.
 */
export function t(key: string, options?: Record<string, any>): string {
  return i18n.t(key, options)
}
