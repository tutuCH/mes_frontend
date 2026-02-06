import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton"

export default function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const { login, googleLogin, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Get the redirect path from state (set by ProtectedRoute)
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/"

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.message || t('login.failed'))
    }
  }

  const handleGoogleSuccess = async (idToken: string) => {
    setError("")
    setIsGoogleLoading(true)
    try {
      await googleLogin(idToken)
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.message || t('auth.googleSignInFailed'))
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleGoogleError = (error: string) => {
    setError(error)
  }

  const isDisabled = isLoading || isGoogleLoading

  return (
    <div className="flex app-root-height safe-area-padding items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('login.title')}</CardTitle>
          <CardDescription>{t('login.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Input
                type="email"
                placeholder={t('login.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isDisabled}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder={t('login.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isDisabled}
                required
              />
            </div>
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={isDisabled}>
              {isLoading ? t('login.signingIn') : t('login.signIn')}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('auth.orContinueWith')}
              </span>
            </div>
          </div>

          {/* Google Sign In */}
          <GoogleAuthButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            disabled={isDisabled}
          />
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Link to="/signup" className="text-primary hover:underline">
              {t('auth.signUp')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
