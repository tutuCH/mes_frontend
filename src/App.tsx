import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import { SubscriptionProvider } from "@/contexts/SubscriptionContext"
import { Suspense, lazy } from "react"
import LoadingScreen from "@/components/ui/LoadingScreen"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { Toaster } from "sonner"
import { GlobalSSEManager } from "@/components/GlobalSSEManager"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { I18nextProvider } from "react-i18next"
import { LanguageProvider } from "@/contexts/LanguageContext"
import i18n from "@/i18n/config"

// Lazy load layouts and pages
const DashboardLayout = lazy(() => import("@/layouts/DashboardLayout"))
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"))
const SignUpPage = lazy(() => import("@/pages/auth/SignUpPage"))
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"))
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"))
const VerifyEmailPage = lazy(() => import("@/pages/auth/VerifyEmailPage"))
const AccessDeniedPage = lazy(() => import("@/pages/auth/AccessDeniedPage"))
const FactoryOverview = lazy(() => import("@/pages/dashboard/FactoryOverview"))
const MachineDetail = lazy(() => import("@/pages/machine/MachineDetail"))
const SPCAnalysis = lazy(() => import("@/pages/quality/SPCAnalysis"))
const AlarmList = lazy(() => import("@/pages/alarms/AlarmList"))
const MaintenanceDashboard = lazy(() => import("@/pages/maintenance/MaintenanceDashboard"))
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"))
const SubscriptionRequired = lazy(() => import("@/pages/subscription/SubscriptionRequired"))
const IoTData = lazy(() => import("@/pages/iot/IoTData"))
const InventoryDashboard = lazy(() => import("@/pages/inventory/InventoryDashboard"))
const MaterialDetail = lazy(() => import("@/pages/inventory/MaterialDetail"))

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <ErrorBoundary>
          <AuthProvider>
            <SubscriptionProvider>
              <BrowserRouter>
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  {/* Auth pages OUTSIDE GlobalSSEManager - no stream connection before auth */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignUpPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                  <Route path="/access-denied" element={<AccessDeniedPage />} />

                  {/* Protected routes INSIDE GlobalSSEManager - stream connects after login */}
                  <Route path="/" element={
                    <ProtectedRoute requireSubscription>
                      <GlobalSSEManager>
                        <DashboardLayout />
                      </GlobalSSEManager>
                    </ProtectedRoute>
                  }>
                    <Route index element={<FactoryOverview />} />
                    <Route path="machine/:id" element={<MachineDetail />} />
                    <Route path="spc" element={<SPCAnalysis />} />
                    <Route path="alarms" element={<AlarmList />} />
                    <Route path="maintenance" element={<MaintenanceDashboard />} />
                    <Route path="inventory" element={<InventoryDashboard />} />
                    <Route path="inventory/:materialId" element={<MaterialDetail />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="iot" element={<IoTData />} />
                  </Route>

                  {/* Subscription required page - for redirects */}
                  <Route path="/subscription-required" element={
                    <ProtectedRoute>
                      <SubscriptionRequired />
                    </ProtectedRoute>
                  } />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
              <Toaster position="top-right" theme="dark" richColors />
            </BrowserRouter>
          </SubscriptionProvider>
          </AuthProvider>
        </ErrorBoundary>
      </LanguageProvider>
    </I18nextProvider>
  )
}

export default App
