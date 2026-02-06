import { afterEach, describe, expect, test, vi } from 'vitest'
import { generateUUID } from '@/utils/uuid'

type MockCrypto = {
  randomUUID?: () => string
  getRandomValues?: (array: Uint8Array) => Uint8Array
}

const originalCrypto = globalThis.crypto

afterEach(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: originalCrypto,
    configurable: true,
  })
})

describe('generateUUID', () => {
  test('uses crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => 'fixed-id')
    const mockCrypto: MockCrypto = { randomUUID }

    Object.defineProperty(globalThis, 'crypto', {
      value: mockCrypto,
      configurable: true,
    })

    expect(generateUUID()).toBe('fixed-id')
    expect(randomUUID).toHaveBeenCalledTimes(1)
  })

  test('falls back to getRandomValues when randomUUID is missing', () => {
    const mockCrypto: MockCrypto = {
      getRandomValues: (array: Uint8Array) => {
        for (let i = 0; i < array.length; i += 1) {
          array[i] = i
        }
        return array
      },
    }

    Object.defineProperty(globalThis, 'crypto', {
      value: mockCrypto,
      configurable: true,
    })

    const value = generateUUID()
    expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})
