export type LoginRedirectLocation = {
  pathname?: string
  search?: string
  hash?: string
}

export type LoginLocationState = {
  from?: LoginRedirectLocation
} | null | undefined

const OAUTH_REDIRECT_PATH_STORAGE_KEY = 'auth_oauth_redirect_path'

export function resolveLoginRedirectPath(state: LoginLocationState): string {
  const pathname = state?.from?.pathname || '/'
  const search = state?.from?.search || ''
  const hash = state?.from?.hash || ''

  return `${pathname}${search}${hash}`
}

export function storeOAuthRedirectPath(path: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(OAUTH_REDIRECT_PATH_STORAGE_KEY, path)
}

export function consumeOAuthRedirectPath(): string | null {
  if (typeof window === 'undefined') return null

  const storedPath = sessionStorage.getItem(OAUTH_REDIRECT_PATH_STORAGE_KEY)
  if (!storedPath) return null

  sessionStorage.removeItem(OAUTH_REDIRECT_PATH_STORAGE_KEY)
  return storedPath
}
