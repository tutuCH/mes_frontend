const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])
const DEFAULT_PORT = '3000'
const DEFAULT_URL = `http://localhost:${DEFAULT_PORT}`

type ResolveOptions = {
  envUrl?: string
  isDev?: boolean
  locationHostname?: string
  locationProtocol?: string
}

export function resolveApiBaseUrl({
  envUrl,
  isDev,
  locationHostname,
  locationProtocol,
}: ResolveOptions): string {
  const hostname = locationHostname?.trim()
  const protocol = locationProtocol || 'http:'
  const normalizedEnvUrl = envUrl?.trim()

  if (normalizedEnvUrl) {
    if (!isDev || !hostname || LOCAL_HOSTS.has(hostname)) {
      return normalizedEnvUrl
    }

    try {
      const parsed = new URL(normalizedEnvUrl)
      if (!LOCAL_HOSTS.has(parsed.hostname)) {
        return normalizedEnvUrl
      }

      const port = parsed.port || DEFAULT_PORT
      const basePath = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.replace(/\/$/, '') : ''
      return `${protocol}//${hostname}:${port}${basePath}`
    } catch {
      return normalizedEnvUrl
    }
  }

  if (isDev && hostname && !LOCAL_HOSTS.has(hostname)) {
    return `${protocol}//${hostname}:${DEFAULT_PORT}`
  }

  return DEFAULT_URL
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return resolveApiBaseUrl({
      envUrl: import.meta.env.VITE_API_URL,
      isDev: import.meta.env.DEV,
    })
  }

  return resolveApiBaseUrl({
    envUrl: import.meta.env.VITE_API_URL,
    isDev: import.meta.env.DEV,
    locationHostname: window.location.hostname,
    locationProtocol: window.location.protocol,
  })
}
