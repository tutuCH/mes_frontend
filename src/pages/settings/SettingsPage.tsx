import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserSettingsTab } from './UsersSettingsTab'
import { DevicesSettingsTab } from './DevicesSettingsTab'
import PersonalSettingsSection from './PersonalSettingsSection'
import { PaymentSettingsTab } from './PaymentSettingsTab'

export default function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('settings.description')}</p>
      </div>

      {/* Tabs */}
      <Card>
        <Tabs defaultValue="personal" className="w-full">
          {/* Tabs List */}
          <div className="border-b px-6 py-3">
            <TabsList className="grid w-full max-w-lg grid-cols-4">
              <TabsTrigger value="personal">{t('settings.tabs.personal')}</TabsTrigger>
              <TabsTrigger value="users">{t('settings.tabs.users')}</TabsTrigger>
              <TabsTrigger value="devices">{t('settings.tabs.devices')}</TabsTrigger>
              <TabsTrigger value="payment">{t('settings.tabs.payment')}</TabsTrigger>
            </TabsList>
          </div>

          {/* Personal Tab */}
          <TabsContent value="personal" className="p-6">
            <PersonalSettingsSection />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="p-6">
            <UserSettingsTab />
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices" className="p-6">
            <DevicesSettingsTab />
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment" className="p-6">
            <PaymentSettingsTab />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
