import { Link, Outlet, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, LogOut, Settings, LineChart, AlertTriangle, Wrench, User } from 'lucide-react'

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-background hidden md:flex flex-col z-20">
          <div className="p-6 border-b border-border">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              NEXUS<span className="font-light text-muted-foreground">MES</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">Production Control</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            <Link to="/" className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}>
              <LayoutDashboard className="h-4 w-4" />
              Control Room
            </Link>
            <Link to="/spc" className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/spc' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}>
              <LineChart className="h-4 w-4" />
              SPC Analysis
            </Link>
            <Link to="/alarms" className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/alarms' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}>
              <AlertTriangle className="h-4 w-4" />
              Alarms
            </Link>
            <Link to="/maintenance" className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/maintenance' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}>
              <Wrench className="h-4 w-4" />
              Maintenance
            </Link>
            
            <div className="pt-6 pb-2">
              <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                System
              </h4>
            </div>
            <Link to="/admin/devices" className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/admin/devices' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}>
              <Settings className="h-4 w-4" />
              Devices
            </Link>
            <Link to="/admin/users" className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/admin/users' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}>
              <User className="h-4 w-4" />
              Users
            </Link>
          </nav>
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold text-xs border border-border">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto relative z-10 bg-background">
          <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-8 sticky top-0 z-30">
            <h2 className="text-lg font-medium tracking-tight text-foreground">
              {location.pathname === '/' && 'Factory Overview'}
              {location.pathname === '/spc' && 'SPC Analysis'}
              {location.pathname === '/alarms' && 'Alarms & Events'}
              {location.pathname === '/maintenance' && 'Maintenance Dashboard'}
              {location.pathname.includes('/admin') && 'System Administration'}
              {location.pathname.includes('/machine') && 'Machine Detail'}
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-medium text-status-green bg-status-green/10 px-3 py-1 rounded-full border border-status-green/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-status-green"></span>
                </span>
                ONLINE
              </div>
            </div>
          </header>
          
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
