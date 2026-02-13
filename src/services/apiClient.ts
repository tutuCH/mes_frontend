import { createLogger } from '@/utils/logger'

const logger = createLogger('apiClient')

type AccessTokenProvider = () => Promise<string | null>

let accessTokenProvider: AccessTokenProvider = async () => null

export function setAccessTokenProvider(provider: AccessTokenProvider) {
  accessTokenProvider = provider
}

export async function getAccessToken(): Promise<string | null> {
  try {
    return await accessTokenProvider()
  } catch (error) {
    logger.warn('Access token provider failed', error)
    return null
  }
}

export async function getAuthorizationHeader(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    return {}
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  }
}
