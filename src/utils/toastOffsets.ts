export const TOAST_TOP_OFFSET = 'calc(env(safe-area-inset-top) + 72px)'

export function getToastOffsets() {
  return {
    top: TOAST_TOP_OFFSET,
    right: 16,
  }
}

export function getToastMobileOffsets() {
  return {
    top: TOAST_TOP_OFFSET,
    left: 16,
    right: 16,
  }
}
