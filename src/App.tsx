import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import { Suspense, lazy } from "react"
import LoadingScreen from "@/components/ui/LoadingScreen"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { Toaster } from "sonner"

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

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<FactoryOverview />} />
                <Route path="machine/:id" element={<MachineDetail />} />
                <Route path="spc" element={<SPCAnalysis />} />
                <Route path="alarms" element={<AlarmList />} />
                <Route path="maintenance" element={<MaintenanceDashboard />} />
                <Route path="admin/devices" element={<DeviceRegistry />} />
                <Route path="admin/users" element={<UserManagement />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <Toaster position="top-right" theme="dark" richColors />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
