import { describe, expect, test } from 'vitest'
import { getInputClassName } from '@/utils/inputClassnames'

describe('getInputClassName', () => {
  test('includes minimum font size to avoid iOS zoom', () => {
    expect(getInputClassName({ type: 'text' })).toContain('text-[16px]')
  })

  test('adds number font styles for numeric inputs', () => {
    expect(getInputClassName({ type: 'number' })).toContain('font-mono')
  })
})
