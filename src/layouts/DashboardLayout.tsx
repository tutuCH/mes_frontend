import { useState } from 'react'
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { LayoutDashboard, LogOut, Settings, LineChart, AlertTriangle, Wrench, User, Database, Circle, Menu } from 'lucide-react'

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
        Control Room
      </Link>
      <Link to="/spc" className={navLinkClass('/spc')} onClick={onLinkClick}>
        <LineChart className="h-4 w-4" />
        SPC Analysis
      </Link>
      <Link to="/alarms" className={navLinkClass('/alarms')} onClick={onLinkClick}>
        <AlertTriangle className="h-4 w-4" />
        Alarms
      </Link>
      <Link to="/maintenance" className={navLinkClass('/maintenance')} onClick={onLinkClick}>
        <Wrench className="h-4 w-4" />
        Maintenance
      </Link>
      <Link to="/iot" className={navLinkClass('/iot')} onClick={onLinkClick}>
        <Database className="h-4 w-4" />
        IoT Data
      </Link>

      <div className="pt-6 pb-2">
        <h4 className="px-4 text-label">
          System
        </h4>
      </div>
      <Link to="/admin/devices" className={navLinkClass('/admin/devices')} onClick={onLinkClick}>
        <Settings className="h-4 w-4" />
        Devices
      </Link>
      <Link to="/admin/users" className={navLinkClass('/admin/users')} onClick={onLinkClick}>
        <User className="h-4 w-4" />
        Users
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
                Nexus<span className="font-normal text-muted-foreground">MES</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Production Control
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
              Sign Out
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
                      Nexus<span className="font-normal text-muted-foreground">MES</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                      Production Control
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
                      Sign Out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <h2 className="text-lg font-semibold tracking-tight">
                {location.pathname === '/' && 'Factory Overview'}
                {location.pathname === '/spc' && 'SPC Analysis'}
                {location.pathname === '/alarms' && 'Alarms & Events'}
                {location.pathname === '/maintenance' && 'Maintenance Dashboard'}
                {location.pathname.includes('/admin') && 'System Administration'}
                {location.pathname.includes('/machine') && 'Machine Detail'}
                {location.pathname === '/iot' && 'IoT Data Explorer'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                <span className="text-muted-foreground hidden sm:inline">System Online</span>
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
