import { describe, expect, it } from 'vitest'
import { store } from '@/store'

describe('store', () => {
  it('registers the inventory slice', () => {
    const state = store.getState()
    expect(state).toHaveProperty('inventory')
  })
})
