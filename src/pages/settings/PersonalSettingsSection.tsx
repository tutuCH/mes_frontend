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
import { isValidE164Phone } from '@/utils/validation'
import { createLogger } from '@/utils/logger'

const logger = createLogger('PersonalSettingsSection')

export default function PersonalSettingsSection() {
  const { t } = useTranslation()
  const { user, updateProfile, updatePhoneNumber, changePassword, signOut, refreshProfile } = useAuth()
  const { language, setLanguage } = useLanguage()

  const [isUpdating, setIsUpdating] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Personal info form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
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
        phoneNumber: user.phoneNumber || '',
      })
    }
  }, [user])

  const handleProfileUpdate = async () => {
    const trimmedPhoneNumber = formData.phoneNumber.trim()
    if (!isValidE164Phone(trimmedPhoneNumber)) {
      setUpdateMessage({ type: 'error', text: t('auth.errors.invalidPhoneNumber') })
      return
    }

    setIsUpdating(true)
    setUpdateMessage(null)

    const currentName = user?.name || ''
    const currentEmail = user?.email || ''
    const currentPhoneNumber = user?.phoneNumber || ''
    const profileChanged = formData.name !== currentName || formData.email !== currentEmail
    const phoneChanged = trimmedPhoneNumber !== currentPhoneNumber

    try {
      if (profileChanged) {
        await updateProfile({ name: formData.name, email: formData.email })
      }

      if (phoneChanged) {
        await updatePhoneNumber(trimmedPhoneNumber)
      }

      await refreshProfile()
      setUpdateMessage({ type: 'success', text: t('settings.personal.alerts.profileUpdated') })
    } catch (error) {
      logger.error('Failed to update profile:', error)
      setUpdateMessage({
        type: 'error',
        text: phoneChanged ? t('settings.personal.alerts.phoneUpdateFailed') : t('settings.personal.alerts.updateFailed'),
      })
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
    const languages: Array<'en' | 'zh-TW' | 'zh-CN' | 'vi'> = ['en', 'zh-TW', 'zh-CN', 'vi']
    const currentIndex = languages.indexOf(language)
    const nextIndex = (currentIndex + 1) % languages.length
    setLanguage(languages[nextIndex])
  }

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'en':
        return t('settings.personal.appSettings.language.names.en')
      case 'zh-TW':
        return t('settings.personal.appSettings.language.names.zhTW')
      case 'zh-CN':
        return t('settings.personal.appSettings.language.names.zhCN')
      case 'vi':
        return t('settings.personal.appSettings.language.names.vi')
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
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">{t('settings.personal.personalInfo.phone')}</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder={t('auth.phoneNumberPlaceholder')}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={handleProfileUpdate}
                disabled={
                  isUpdating
                    || !formData.name
                    || !formData.email
                    || !formData.phoneNumber
                    || !isValidE164Phone(formData.phoneNumber.trim())
                }
                className="w-full sm:w-auto"
              >
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUpdating ? t('settings.personal.personalInfo.updating') : t('settings.personal.personalInfo.saveChanges')}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsPasswordDialogOpen(true)}
                className="w-full sm:w-auto"
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
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h4 className="text-sm font-medium">{t('settings.personal.appSettings.language.title')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('settings.personal.appSettings.language.current', { lang: getLanguageLabel(language) })}
              </p>
            </div>
            <Button variant="outline" onClick={handleLanguageToggle} className="w-full sm:w-auto">
              <Languages className="mr-2 h-4 w-4" />
              {t('settings.personal.appSettings.language.switch')}
            </Button>
          </div>

          {/* Logout */}
          <div className="flex flex-col items-start justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
            <div>
              <h4 className="text-sm font-medium">{t('settings.personal.appSettings.logout.title')}</h4>
              <p className="text-sm text-muted-foreground">{t('settings.personal.appSettings.logout.description')}</p>
            </div>
              <Button
                variant="outline"
                onClick={signOut}
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground sm:w-auto"
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
