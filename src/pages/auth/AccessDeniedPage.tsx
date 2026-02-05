import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldX, Home, ArrowLeft } from 'lucide-react'

export default function AccessDeniedPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-dvh safe-area-padding items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <ShieldX className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">{t('auth.accessDenied')}</CardTitle>
          <CardDescription className="text-base">
            {t('auth.accessDeniedMessage')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>{t('auth.accessDeniedHelp')}</p>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Link to="/" className="w-full">
            <Button className="w-full">
              <Home className="mr-2 h-4 w-4" />
              {t('auth.goToDashboard')}
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('auth.goBack')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
