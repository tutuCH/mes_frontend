/**
 * Date and User Display Utilities
 *
 * This module provides utilities for safe date formatting and user display name handling.
 * All functions include validation to prevent runtime errors from undefined/null values.
 */

// ============ Date Utilities ============

/**
 * Validates if a string can be parsed into a valid Date
 * @param dateString - The date string to validate
 * @returns true if the string can be parsed into a valid Date
 */
export function isValidDateString(dateString: string | null | undefined): boolean {
  if (!dateString || dateString.trim() === '') {
    return false;
  }
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Format date to locale time string with validation
 * @param dateString - The date string to format
 * @param fallback - Fallback string for invalid dates (default: '--:--:--')
 * @returns Formatted time string or fallback
 */
export function formatLocaleTime(
  dateString: string | null | undefined,
  fallback: string = '--:--:--'
): string {
  if (!isValidDateString(dateString)) {
    return fallback;
  }
  return new Date(dateString!).toLocaleTimeString();
}

/**
 * Format date to locale string with validation
 * @param dateString - The date string to format
 * @param fallback - Fallback string for invalid dates (default: 'Invalid Date')
 * @returns Formatted datetime string or fallback
 */
export function formatLocaleString(
  dateString: string | null | undefined,
  fallback: string = 'Invalid Date'
): string {
  if (!isValidDateString(dateString)) {
    return fallback;
  }
  return new Date(dateString!).toLocaleString();
}

/**
 * Format date to locale date string with validation
 * @param dateString - The date string to format
 * @param fallback - Fallback string for invalid dates (default: 'Invalid Date')
 * @returns Formatted date string or fallback
 */
export function formatLocaleDate(
  dateString: string | null | undefined,
  fallback: string = 'Invalid Date'
): string {
  if (!isValidDateString(dateString)) {
    return fallback;
  }
  return new Date(dateString!).toLocaleDateString();
}

/**
 * Get formatted timestamp with validation
 * @param timestamp - The timestamp (string or Date object)
 * @param format - Format type: 'time', 'full', or 'date' (default: 'time')
 * @param fallback - Fallback string for invalid dates (default: '--')
 * @returns Formatted timestamp or fallback
 */
export function formatTimestamp(
  timestamp: string | Date | null | undefined,
  format: 'time' | 'full' | 'date' = 'time',
  fallback: string = '--'
): string {
  if (!timestamp) {
    return fallback;
  }

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  if (isNaN(date.getTime())) {
    return fallback;
  }

  switch (format) {
    case 'time':
      return date.toLocaleTimeString();
    case 'full':
      return date.toLocaleString();
    case 'date':
      return date.toLocaleDateString();
    default:
      return date.toLocaleTimeString();
  }
}

// ============ User Display Utilities ============

/**
 * Get user's display name with fallback
 * Returns the user's name if available, otherwise falls back to email
 * @param user - User object with optional name and required email
 * @returns User's display name (name or email)
 */
export function getUserDisplayName(user: { name?: string | null; email: string }): string {
  if (user.name && user.name.trim()) {
    return user.name;
  }
  // Fallback to email if name is undefined/empty
  return user.email;
}

/**
 * Get user initials for avatar
 * Returns first 2 characters uppercase from name or email
 * @param user - User object with optional name and required email
 * @returns User's initials (2 characters, uppercase)
 */
export function getUserInitials(user: { name?: string | null; email: string }): string {
  const displayName = getUserDisplayName(user);
  return displayName.substring(0, 2).toUpperCase();
}
