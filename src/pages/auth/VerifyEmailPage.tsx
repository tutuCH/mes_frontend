import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react'

type VerificationStatus = 'idle' | 'submitting' | 'success'

export default function VerifyEmailPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { confirmSignUp, resendSignUpCode } = useAuth()

  const initialEmail = searchParams.get('email') || ''

  const [status, setStatus] = useState<VerificationStatus>('idle')
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail)
    }
  }, [initialEmail])

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email || !code) {
      setErrorMessage(t('auth.errors.codeAndEmailRequired'))
      return
    }

    setStatus('submitting')
    setErrorMessage('')

    try {
      await confirmSignUp(email, code)
      setStatus('success')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ''
      setErrorMessage(message || t('auth.verificationFailed'))
      setStatus('idle')
    }
  }

  const handleResend = async () => {
    if (!email) {
      setErrorMessage(t('auth.errors.emailRequired'))
      return
    }

    setErrorMessage('')
    setIsResending(true)

    try {
      await resendSignUpCode(email)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ''
      setErrorMessage(message || t('auth.verificationFailed'))
    } finally {
      setIsResending(false)
    }
  }

  if (status === 'success') {
    return (
      <div className="flex app-root-height safe-area-padding items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t('auth.emailVerified')}</CardTitle>
            <CardDescription>{t('auth.emailVerifiedMessage')}</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>{t('auth.canNowLogin')}</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate('/login')}>
              {t('auth.signIn')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex app-root-height safe-area-padding items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <Mail className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl">{t('auth.verifyCodeTitle')}</CardTitle>
          <CardDescription>{t('auth.verifyCodeSubtitle')}</CardDescription>
        </CardHeader>

        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('auth.verifyCodeHelp')}
          </p>
          <form onSubmit={handleVerify} className="space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-500 bg-red-50 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {errorMessage}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                disabled={status === 'submitting'}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="verificationCode">{t('auth.verificationCode')}</Label>
              <Input
                id="verificationCode"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={t('auth.verificationCodePlaceholder')}
                disabled={status === 'submitting'}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={status === 'submitting'}>
              {status === 'submitting' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.verifyingEmail')}
                </>
              ) : (
                t('auth.verifyCodeButton')
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={isResending || status === 'submitting'}
            >
              {isResending ? t('auth.resendingCode') : t('auth.resendCode')}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            {t('auth.backToLogin')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
