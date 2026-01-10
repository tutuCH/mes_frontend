import { useState } from 'react'
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useAuth } from "@/context/AuthContext"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { LayoutDashboard, LogOut, Settings, LineChart, AlertTriangle, Wrench, Database, Circle, Menu } from 'lucide-react'
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher"
import { type RootState } from '@/store'
import { cn } from '@/lib/utils'

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const { t } = useTranslation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const websocketStatus = useSelector((state: RootState) => state.factories.websocketStatus)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const navLinkClass = (path: string, exact = true) => {
    const isActive = exact ? location.pathname === path : location.pathname.startsWith(path)
    return `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-smooth ${
      isActive
        ? 'bg-primary/10 text-primary border-l-2 border-primary'
        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
    }`
  }

  const handleMobileNavClose = () => setMobileNavOpen(false)

  // Shared navigation links component
  const NavLinks = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <>
      <Link to="/" className={navLinkClass('/')} onClick={onLinkClick}>
        <LayoutDashboard className="h-4 w-4" />
        {t('navigation.controlRoom')}
      </Link>
      <Link to="/spc" className={navLinkClass('/spc')} onClick={onLinkClick}>
        <LineChart className="h-4 w-4" />
        {t('navigation.spcAnalysis')}
      </Link>
      <Link to="/alarms" className={navLinkClass('/alarms')} onClick={onLinkClick}>
        <AlertTriangle className="h-4 w-4" />
        {t('navigation.alarms')}
      </Link>
      <Link to="/maintenance" className={navLinkClass('/maintenance')} onClick={onLinkClick}>
        <Wrench className="h-4 w-4" />
        {t('navigation.maintenance')}
      </Link>
      <Link to="/iot" className={navLinkClass('/iot')} onClick={onLinkClick}>
        <Database className="h-4 w-4" />
        {t('navigation.iotData')}
      </Link>

      <div className="pt-6 pb-2">
        <h4 className="px-4 text-label">
          {t('system')}
        </h4>
      </div>
      <Link to="/settings" className={navLinkClass('/settings')} onClick={onLinkClick}>
        <Settings className="h-4 w-4" />
        {t('navigation.settings')}
      </Link>
    </>
  )

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col z-20">
          {/* Logo Section */}
          <div className="p-6 border-b border-border">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {t('appName')}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {t('tagline')}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <NavLinks />
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate capitalize">{user?.role}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('navigation.signOut')}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto relative z-10 bg-background">
          {/* Header */}
          <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 lg:px-8 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger menu */}
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  {/* Mobile navigation header */}
                  <div className="p-6 border-b border-border">
                    <h1 className="text-xl font-semibold tracking-tight">
                      {t('appName')}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('tagline')}
                    </p>
                  </div>
                  {/* Mobile navigation links */}
                  <nav className="flex-1 p-4 space-y-2">
                    <NavLinks onLinkClick={handleMobileNavClose} />
                  </nav>
                  {/* Mobile user section */}
                  <div className="p-4 border-t border-border mt-auto">
                    <div className="flex items-center gap-3 mb-4 px-2">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">{user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate capitalize">{user?.role}</p>
                      </div>
                    </div>
                    <Button variant="ghost" className="w-full justify-start" onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('navigation.signOut')}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <h2 className="text-lg font-semibold tracking-tight">
                {location.pathname === '/' && t('dashboard.title')}
                {location.pathname === '/spc' && t('spc.title')}
                {location.pathname === '/alarms' && t('alarms.title')}
                {location.pathname === '/maintenance' && t('maintenance.title')}
                {location.pathname === '/settings' && t('settings.title')}
                {location.pathname.includes('/admin') && t('system') + ' ' + t('navigation.users')}
                {location.pathname.includes('/machine') && t('machine.notFound')}
                {location.pathname === '/iot' && t('iot.title')}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <div className="flex items-center gap-2 text-sm">
                <Circle className={cn(
                  "h-2 w-2",
                  websocketStatus === 'connected' ? "fill-green-500 text-green-500" :
                  websocketStatus === 'connecting' ? "fill-yellow-500 text-yellow-500" :
                  "fill-gray-400 text-gray-400"
                )} />
                <span className="text-muted-foreground hidden sm:inline">
                  {websocketStatus === 'connected' && t('factoryView.online')}
                  {websocketStatus === 'connecting' && t('factoryView.connecting')}
                  {websocketStatus === 'disconnected' && t('factoryView.offline')}
                </span>
              </div>
            </div>
          </header>

          <div className="p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
