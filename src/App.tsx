import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import { Suspense, lazy } from "react"
import LoadingScreen from "@/components/ui/LoadingScreen"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { Toaster } from "sonner"
import { GlobalWebSocketManager } from "@/components/GlobalWebSocketManager"
import { I18nextProvider } from "react-i18next"
import { LanguageProvider } from "@/contexts/LanguageContext"
import i18n from "@/i18n/config"

// Lazy load layouts and pages
const DashboardLayout = lazy(() => import("@/layouts/DashboardLayout"))
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"))
const FactoryOverview = lazy(() => import("@/pages/dashboard/FactoryOverview"))
const MachineDetail = lazy(() => import("@/pages/machine/MachineDetail"))
const SPCAnalysis = lazy(() => import("@/pages/quality/SPCAnalysis"))
const AlarmList = lazy(() => import("@/pages/alarms/AlarmList"))
const MaintenanceDashboard = lazy(() => import("@/pages/maintenance/MaintenanceDashboard"))
const DeviceRegistry = lazy(() => import("@/pages/admin/DeviceRegistry"))
const UserManagement = lazy(() => import("@/pages/admin/UserManagement"))
const IoTData = lazy(() => import("@/pages/iot/IoTData"))

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <ErrorBoundary>
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  {/* Login page OUTSIDE GlobalWebSocketManager - no WebSocket connection before auth */}
                  <Route path="/login" element={<LoginPage />} />

                  {/* Protected routes INSIDE GlobalWebSocketManager - WebSocket connects after login */}
                  <Route path="/" element={
                    <GlobalWebSocketManager>
                      <DashboardLayout />
                    </GlobalWebSocketManager>
                  }>
                    <Route index element={<FactoryOverview />} />
                    <Route path="machine/:id" element={<MachineDetail />} />
                    <Route path="spc" element={<SPCAnalysis />} />
                    <Route path="alarms" element={<AlarmList />} />
                    <Route path="maintenance" element={<MaintenanceDashboard />} />
                    <Route path="admin/devices" element={<DeviceRegistry />} />
                    <Route path="admin/users" element={<UserManagement />} />
                    <Route path="iot" element={<IoTData />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
              <Toaster position="top-right" theme="dark" richColors />
            </BrowserRouter>
          </AuthProvider>
        </ErrorBoundary>
      </LanguageProvider>
    </I18nextProvider>
  )
}

export default App
