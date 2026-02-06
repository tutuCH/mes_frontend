import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserSettingsTab } from './UsersSettingsTab'
import { DevicesSettingsTab } from './DevicesSettingsTab'
import PersonalSettingsSection from './PersonalSettingsSection'
import { PaymentSettingsTab } from './PaymentSettingsTab'

export default function SettingsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('personal')

  const tabOptions = [
    { value: 'personal', label: t('settings.tabs.personal') },
    { value: 'users', label: t('settings.tabs.users') },
    { value: 'devices', label: t('settings.tabs.devices') },
    { value: 'payment', label: t('settings.tabs.payment') },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl p-3 sm:p-6">
      {/* Page Header */}
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">{t('settings.description')}</p>
      </div>

      {/* Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tabs List */}
          <div className="border-b px-3 py-3 sm:px-6">
            <div className="sm:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tabOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <TabsList className="inline-flex min-w-max gap-1 p-1">
                <TabsTrigger value="personal" className="px-4">
                  {t('settings.tabs.personal')}
                </TabsTrigger>
                <TabsTrigger value="users" className="px-4">
                  {t('settings.tabs.users')}
                </TabsTrigger>
                <TabsTrigger value="devices" className="px-4">
                  {t('settings.tabs.devices')}
                </TabsTrigger>
                <TabsTrigger value="payment" className="px-4">
                  {t('settings.tabs.payment')}
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Personal Tab */}
          <TabsContent value="personal" className="p-3 sm:p-6">
            <PersonalSettingsSection />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="p-3 sm:p-6">
            <UserSettingsTab />
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices" className="p-3 sm:p-6">
            <DevicesSettingsTab />
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment" className="p-3 sm:p-6">
            <PaymentSettingsTab />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
