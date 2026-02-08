export type LoginRedirectLocation = {
  pathname?: string
  search?: string
  hash?: string
}

export type LoginLocationState = {
  from?: LoginRedirectLocation
} | null | undefined

export function resolveLoginRedirectPath(state: LoginLocationState): string {
  const pathname = state?.from?.pathname || '/'
  const search = state?.from?.search || ''
  const hash = state?.from?.hash || ''

  return `${pathname}${search}${hash}`
}
