import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Key, Languages, LogOut, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createLogger } from '@/utils/logger'

const logger = createLogger('PersonalSettingsSection')

export default function PersonalSettingsSection() {
  const { t } = useTranslation()
  const { user, updateProfile, changePassword, logout, refreshProfile } = useAuth()
  const { language, setLanguage } = useLanguage()

  const [isUpdating, setIsUpdating] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Personal info form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Password validation errors
  const [passwordErrors, setPasswordErrors] = useState<{
    current?: string
    new?: string
    confirm?: string
  }>({})

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
      })
    }
  }, [user])

  const handleProfileUpdate = async () => {
    setIsUpdating(true)
    setUpdateMessage(null)

    try {
      await updateProfile({ name: formData.name, email: formData.email })
      await refreshProfile()
      setUpdateMessage({ type: 'success', text: t('settings.personal.alerts.profileUpdated') })
    } catch (error) {
      logger.error('Failed to update profile:', error)
      setUpdateMessage({ type: 'error', text: t('settings.personal.alerts.updateFailed') })
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePasswordChange = async () => {
    // Validate password fields
    const errors: typeof passwordErrors = {}

    if (!passwordData.currentPassword) {
      errors.current = t('settings.personal.changePassword.errors.required')
    }
    if (!passwordData.newPassword) {
      errors.new = t('settings.personal.changePassword.errors.required')
    } else if (passwordData.newPassword.length < 8) {
      errors.new = t('settings.personal.changePassword.errors.minLength')
    }
    if (!passwordData.confirmPassword) {
      errors.confirm = t('settings.personal.changePassword.errors.required')
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirm = t('settings.personal.changePassword.errors.passwordMismatch')
    }

    setPasswordErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsChangingPassword(true)
    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      toast.success(t('settings.personal.alerts.passwordChanged'))
      setIsPasswordDialogOpen(false)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setPasswordErrors({})
    } catch (error) {
      logger.error('Failed to change password:', error)
      toast.error(t('settings.personal.alerts.updateFailed'))
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleLanguageToggle = () => {
    const languages: Array<'en' | 'zh-TW' | 'zh-CN'> = ['en', 'zh-TW', 'zh-CN']
    const currentIndex = languages.indexOf(language)
    const nextIndex = (currentIndex + 1) % languages.length
    setLanguage(languages[nextIndex])
  }

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'en':
        return 'English'
      case 'zh-TW':
        return '繁體中文'
      case 'zh-CN':
        return '简体中文'
      default:
        return lang
    }
  }

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {updateMessage && (
        <Alert variant={updateMessage.type === 'error' ? 'destructive' : 'default'}>
          {updateMessage.type === 'success' && <CheckCircle className="h-4 w-4" />}
          <AlertDescription>{updateMessage.text}</AlertDescription>
        </Alert>
      )}

      {/* Personal Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.personal.personalInfo.title')}</CardTitle>
          <CardDescription>{t('settings.personal.personalInfo.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t('settings.personal.personalInfo.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('users.namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('settings.personal.personalInfo.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('users.emailPlaceholder')}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleProfileUpdate}
                disabled={isUpdating || !formData.name || !formData.email}
              >
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUpdating ? t('settings.personal.personalInfo.updating') : t('settings.personal.personalInfo.saveChanges')}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsPasswordDialogOpen(true)}
              >
                <Key className="mr-2 h-4 w-4" />
                {t('settings.personal.changePassword.title')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.personal.appSettings.title')}</CardTitle>
          <CardDescription>{t('settings.personal.appSettings.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">{t('settings.personal.appSettings.language.title')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('settings.personal.appSettings.language.current', { lang: getLanguageLabel(language) })}
              </p>
            </div>
            <Button variant="outline" onClick={handleLanguageToggle}>
              <Languages className="mr-2 h-4 w-4" />
              {t('settings.personal.appSettings.language.switch')}
            </Button>
          </div>

          {/* Logout */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <h4 className="text-sm font-medium">{t('settings.personal.appSettings.logout.title')}</h4>
              <p className="text-sm text-muted-foreground">{t('settings.personal.appSettings.logout.description')}</p>
            </div>
            <Button
              variant="outline"
              onClick={logout}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('settings.personal.appSettings.logout.button')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.personal.changePassword.title')}</DialogTitle>
            <DialogDescription>{t('settings.personal.changePassword.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t('settings.personal.changePassword.currentPassword')}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className={passwordErrors.current ? 'border-destructive' : ''}
              />
              {passwordErrors.current && <p className="text-sm text-destructive">{passwordErrors.current}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('settings.personal.changePassword.newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className={passwordErrors.new ? 'border-destructive' : ''}
              />
              {passwordErrors.new && <p className="text-sm text-destructive">{passwordErrors.new}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('settings.personal.changePassword.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className={passwordErrors.confirm ? 'border-destructive' : ''}
              />
              {passwordErrors.confirm && <p className="text-sm text-destructive">{passwordErrors.confirm}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handlePasswordChange} disabled={isChangingPassword}>
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isChangingPassword ? t('settings.personal.changePassword.changing') : t('settings.personal.changePassword.change')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
