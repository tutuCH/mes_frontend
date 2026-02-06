import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import { api } from '@/services/api'
import { resetPasswordSchema, isCommonPassword } from '@/utils/validation'
import { AlertCircle, CheckCircle2, Eye, EyeOff, ArrowLeft } from 'lucide-react'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const { token: paramToken } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Token can come from either URL param or query string
  const token = paramToken || searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Check if token exists
  useEffect(() => {
    if (!token) {
      setServerError(t('auth.invalidResetLink'))
    }
  }, [token, t])

  const validateForm = (): boolean => {
    const result = resetPasswordSchema.safeParse({ password, confirmPassword })

    if (!result.success) {
      const newErrors: { password?: string; confirmPassword?: string } = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as 'password' | 'confirmPassword'
        if (!newErrors[field]) {
          newErrors[field] = issue.message
        }
      })
      setErrors(newErrors)
      return false
    }

    // Additional check for common passwords
    if (isCommonPassword(password)) {
      setErrors({ password: 'This password is too common. Please choose a stronger password.' })
      return false
    }

    setErrors({})
    return true
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) return
    if (!token) {
      setServerError(t('auth.invalidResetLink'))
      return
    }

    setIsLoading(true)
    setServerError('')

    try {
      await api.resetPassword(token, password)
      setIsSuccess(true)
    } catch (err: any) {
      if (err.message?.includes('expired') || err.message?.includes('invalid')) {
        setServerError(t('auth.resetLinkExpired'))
      } else {
        setServerError(err.message || t('auth.resetPasswordFailed'))
      }
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
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t('auth.passwordResetSuccess')}</CardTitle>
            <CardDescription>
              {t('auth.passwordResetSuccessMessage')}
            </CardDescription>
          </CardHeader>
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
          <CardTitle className="text-2xl">{t('auth.resetPassword')}</CardTitle>
          <CardDescription>{t('auth.resetPasswordSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {serverError && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-500 bg-red-50 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {serverError}
              </div>
            )}

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.newPassword')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.newPasswordPlaceholder')}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setErrors({})
                    setServerError('')
                  }}
                  disabled={isLoading || !token}
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              <PasswordStrengthMeter password={password} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirmNewPassword')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t('auth.confirmNewPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setErrors({})
                    setServerError('')
                  }}
                  disabled={isLoading || !token}
                  className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !token}>
              {isLoading ? t('auth.resettingPassword') : t('auth.resetPassword')}
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
