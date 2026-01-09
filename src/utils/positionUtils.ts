/**
 * Parse machine index to grid coordinates
 * Supports formats: "A1", "0-0", "1,5", "0_0", etc.
 * @param index - Machine index string
 * @returns Object with row and col (0-indexed)
 */
export function parseMachineIndex(index: string): { row: number; col: number } {
  if (!index) {
    return { row: 0, col: 0 }
  }

  // Try format: "A1", "B5" (letter row, number column)
  const letterNumberMatch = index.match(/^([A-Z])(\d+)$/)
  if (letterNumberMatch) {
    const row = letterNumberMatch[1].charCodeAt(0) - 65 // 'A' = 0, 'B' = 1, etc.
    const col = parseInt(letterNumberMatch[2]) - 1 // Convert to 0-indexed
    return { row, col }
  }

  // Try format: "0-0", "1-5", "1_5", "1,5" (number-row, number-column)
  const numberNumberMatch = index.match(/^(\d+)[-__,\s](\d+)$/)
  if (numberNumberMatch) {
    const row = parseInt(numberNumberMatch[1])
    const col = parseInt(numberNumberMatch[2])
    return { row, col }
  }

  // Try format: "0", "1", "2" (single number, assume row-major order)
  const singleNumberMatch = index.match(/^(\d+)$/)
  if (singleNumberMatch) {
    const num = parseInt(singleNumberMatch[1])
    // For 10x10 grid, position 15 = row 1, col 5
    const row = Math.floor(num / 10)
    const col = num % 10
    return { row, col }
  }

  return { row: 0, col: 0 }
}

/**
 * Format grid coordinates to machine index
 * Uses "row-col" format (e.g., "0-0", "1-5")
 * @param row - Row number (0-indexed)
 * @param col - Column number (0-indexed)
 * @returns Machine index string
 */
export function formatMachineIndex(row: number, col: number): string {
  return `${row}-${col}`
}

/**
 * Calculate total number of cells in the grid
 * @param width - Grid width (number of columns)
 * @param height - Grid height (number of rows)
 * @returns Total cell count
 */
export function getTotalCells(width: number, height: number): number {
  return width * height
}
