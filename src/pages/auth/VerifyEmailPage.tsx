import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/services/api'
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react'

type VerificationStatus = 'loading' | 'success' | 'error' | 'no-token'

export default function VerifyEmailPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<VerificationStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('no-token')
        return
      }

      try {
        await api.verifyEmail(token)
        setStatus('success')
      } catch (err: any) {
        setStatus('error')
        if (err.message?.includes('expired')) {
          setErrorMessage(t('auth.verificationLinkExpired'))
        } else if (err.message?.includes('invalid')) {
          setErrorMessage(t('auth.invalidVerificationLink'))
        } else if (err.message?.includes('already verified')) {
          setErrorMessage(t('auth.emailAlreadyVerified'))
        } else {
          setErrorMessage(err.message || t('auth.verificationFailed'))
        }
      }
    }

    verifyEmail()
  }, [token, t])

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex app-root-height safe-area-padding items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl">{t('auth.verifyingEmail')}</CardTitle>
            <CardDescription>{t('auth.pleaseWait')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // No token provided
  if (status === 'no-token') {
    return (
      <div className="flex app-root-height safe-area-padding items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <Mail className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl">{t('auth.noVerificationToken')}</CardTitle>
            <CardDescription>{t('auth.noVerificationTokenMessage')}</CardDescription>
          </CardHeader>
          <CardFooter className="flex-col gap-2">
            <Button className="w-full" onClick={() => navigate('/login')}>
              {t('auth.goToLogin')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Success state
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

  // Error state
  return (
    <div className="flex app-root-height safe-area-padding items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">{t('auth.verificationFailed')}</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>{t('auth.verificationFailedHelp')}</p>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button className="w-full" onClick={() => navigate('/login')}>
            {t('auth.goToLogin')}
          </Button>
          <Link to="/signup" className="text-sm text-primary hover:underline">
            {t('auth.createNewAccount')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
