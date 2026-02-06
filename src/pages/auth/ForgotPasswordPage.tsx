import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { api } from '@/services/api'
import { forgotPasswordSchema } from '@/utils/validation'
import { AlertCircle, ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    // Validate email
    const result = forgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setIsLoading(true)

    try {
      await api.forgotPassword(email)
      setIsSuccess(true)
    } catch (err: any) {
      // Don't reveal if email exists or not for security
      // Show success regardless to prevent email enumeration
      setIsSuccess(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex app-root-height safe-area-padding items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t('auth.checkYourEmail')}</CardTitle>
            <CardDescription>
              {t('auth.resetEmailSent', { email })}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground space-y-4">
            <p>{t('auth.resetEmailInstructions')}</p>
            <p className="text-xs">
              {t('auth.didntReceiveEmail')}{' '}
              <button
                onClick={() => {
                  setIsSuccess(false)
                  setEmail('')
                }}
                className="text-primary hover:underline"
              >
                {t('auth.tryAgain')}
              </button>
            </p>
          </CardContent>
          <CardFooter>
            <Link to="/login" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex app-root-height safe-area-padding items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('auth.forgotPassword')}</CardTitle>
          <CardDescription>{t('auth.forgotPasswordSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-500 bg-red-50 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                disabled={isLoading}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('auth.sendingResetLink') : t('auth.sendResetLink')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            {t('auth.backToLogin')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
