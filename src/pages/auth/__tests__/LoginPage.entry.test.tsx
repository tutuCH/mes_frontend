import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import '@/i18n/config'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    authStatus: 'unauthenticated',
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
}))

import LoginPage from '@/pages/auth/LoginPage'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('LoginPage verify entry point', () => {
  it('renders a direct link to verify-email', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>,
      )
    })

    const verifyLink = container.querySelector('a[href="/verify-email"]')
    expect(verifyLink).toBeTruthy()

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
