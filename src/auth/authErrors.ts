export function mapAuthErrorMessage(error: unknown): string {
  const errorName =
    typeof error === 'object' && error !== null && 'name' in error
      ? String((error as { name?: string }).name)
      : ''

  switch (errorName) {
    case 'UserNotFoundException':
      return 'auth.errors.userNotFound'
    case 'NotAuthorizedException':
      return 'auth.errors.notAuthorized'
    case 'UserNotConfirmedException':
      return 'auth.errors.userNotConfirmed'
    case 'CodeMismatchException':
      return 'auth.errors.codeMismatch'
    case 'ExpiredCodeException':
      return 'auth.errors.expiredCode'
    case 'LimitExceededException':
      return 'auth.errors.limitExceeded'
    case 'TooManyRequestsException':
      return 'auth.errors.tooManyRequests'
    case 'UsernameExistsException':
      return 'auth.errors.usernameExists'
    default:
      return 'auth.errors.generic'
  }
}
