import type { LucideIcon } from 'lucide-react'
import { Cpu, WifiOff, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

/**
 * Grid coordinate utility functions for the factory floor map
 * Handles conversion between grid indices and human-readable coordinates (A1, B2, etc.)
 */

/**
 * Convert column index to letter label (0 -> A, 1 -> B, 25 -> Z)
 */
export function getColumnLabel(index: number): string {
  if (index < 0) return '?'
  if (index > 25) return String.fromCharCode(65 + (index % 26)) + Math.floor(index / 26)
  return String.fromCharCode(65 + index)
}

/**
 * Convert row index to number label (0 -> 1, 1 -> 2)
 */
export function getRowLabel(index: number): string {
  return `${index + 1}`
}

/**
 * Format coordinate from row and column indices (0, 0) -> "A1"
 * @deprecated For display purposes only. Use getNumericIndex() for API calls.
 */
export function getCoordinate(row: number, col: number): string {
  return `${getColumnLabel(col)}${getRowLabel(row)}`
}

/**
 * Convert row and column indices to numeric machine index for API
 * Index 0 = top-left (row 0, col 0), filling left-to-right, top-to-bottom
 */
export function getNumericIndex(row: number, col: number, width: number): string {
  return (row * width + col).toString()
}

/**
 * Parse coordinate string to row and column indices "A1" -> {row: 0, col: 0}
 */
export function parseCoordinate(coordinate: string): { row: number; col: number } {
  const match = coordinate.match(/^([A-Z]+)(\d+)$/)
  if (!match) {
    throw new Error(`Invalid coordinate format: ${coordinate}`)
  }

  const colStr = match[1]
  const rowStr = match[2]

  // Convert column letter(s) to index (A -> 0, B -> 1, AA -> 26)
  let col = 0
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64)
  }
  col -= 1 // Adjust for 0-based indexing

  const row = parseInt(rowStr, 10) - 1

  return { row, col }
}

/**
 * Get status color classes for machine cards
 */
export function getStatusColor(status: string | undefined): {
  border: string
  background: string
  icon: string
  dot: string
} {
  // Handle undefined/null status - treat as offline
  const statusLower = (status || 'offline').toLowerCase().trim()

  switch (statusLower) {
    case 'online':
    case 'connected':
      return {
        border: 'border-teal-300',
        background: 'from-teal-50/80 to-teal-100/70',
        icon: 'text-teal-600',
        dot: 'bg-teal-500',
      }
    case 'running':
      return {
        border: 'border-green-300',
        background: 'from-green-50/80 to-green-100/70',
        icon: 'text-green-600',
        dot: 'bg-green-500',
      }
    case 'warning':
    case 'idle':
      return {
        border: 'border-amber-300',
        background: 'from-amber-50/80 to-amber-100/70',
        icon: 'text-amber-600',
        dot: 'bg-amber-500',
      }
    case 'error':
    case 'alarm':
      return {
        border: 'border-red-300',
        background: 'from-red-50/80 to-red-100/70',
        icon: 'text-red-600',
        dot: 'bg-red-500',
      }
    case 'offline':
    case 'stopped':
    case 'disconnected':
    default:
      return {
        border: 'border-gray-300',
        background: 'from-gray-50/80 to-gray-100/70',
        icon: 'text-gray-500',
        dot: 'bg-gray-400',
      }
  }
}

/**
 * Get status icon component
 */
export function getStatusIcon(status: string | undefined): LucideIcon {
  // Handle undefined/null status - treat as offline
  const statusLower = (status || 'offline').toLowerCase().trim()

  switch (statusLower) {
    case 'online':
    case 'connected':
      return CheckCircle2
    case 'running':
      return Cpu
    case 'warning':
    case 'idle':
      return AlertTriangle
    case 'error':
    case 'alarm':
      return XCircle
    case 'offline':
    case 'stopped':
    case 'disconnected':
    default:
      return WifiOff
  }
}

/**
 * Get grid cell size class based on breakpoint
 */
export function getCellSizeClass(): string {
  return 'h-16 sm:h-20 md:h-24 w-full'
}

/**
 * Get header cell size class based on breakpoint
 */
export function getHeaderSizeClass(): string {
  return 'h-5 sm:h-6 w-5 sm:w-6'
}

/**
 * Validate machine index format
 */
export function isValidMachineIndex(index: string): boolean {
  try {
    parseCoordinate(index)
    return true
  } catch {
    return false
  }
}

/**
 * Format machine index from row and col for API
 */
export function formatMachineIndex(row: number, col: number): string {
  return getCoordinate(row, col)
}
