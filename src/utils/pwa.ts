export interface IosInstallCheck {
  userAgent: string
  navigatorStandalone?: boolean
  displayModeStandalone?: boolean
}

export function isIosDevice(userAgent: string): boolean {
  return /iphone|ipad|ipod/i.test(userAgent)
}

export function isIosSafari(userAgent: string): boolean {
  if (!isIosDevice(userAgent)) return false
  const lower = userAgent.toLowerCase()
  const isSafari = lower.includes('safari')
  const excluded = ['crios', 'fxios', 'edgios', 'opios']
  return isSafari && !excluded.some((token) => lower.includes(token))
}

export function isStandaloneMode({
  navigatorStandalone,
  displayModeStandalone,
}: {
  navigatorStandalone?: boolean
  displayModeStandalone?: boolean
}): boolean {
  return Boolean(navigatorStandalone || displayModeStandalone)
}

export function shouldShowIosInstallBanner({
  userAgent,
  navigatorStandalone,
  displayModeStandalone,
}: IosInstallCheck): boolean {
  if (!isIosSafari(userAgent)) return false
  return !isStandaloneMode({ navigatorStandalone, displayModeStandalone })
}
