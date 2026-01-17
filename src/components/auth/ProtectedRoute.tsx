import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { hasPermission, hasRole, type Permission } from '@/utils/permissions'
import { useSubscription } from '@/contexts/SubscriptionContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  /**
   * Required permission to access this route.
   * User must have this permission to view content.
   */
  requiredPermission?: Permission
  /**
   * Required roles to access this route.
   * User must have one of these roles to view content.
   * Takes precedence over requiredPermission if both are specified.
   */
  requiredRoles?: string[]
  /**
   * Whether to check subscription status.
   * If true, will redirect to subscription page if user doesn't have active subscription.
   * Defaults to false.
   */
  requireSubscription?: boolean
  /**
   * Path to redirect to if access is denied.
   * Defaults to '/access-denied'.
   */
  redirectTo?: string
  /**
   * Whether to redirect to login if not authenticated.
   * Defaults to true.
   */
  requireAuth?: boolean
}

/**
 * ProtectedRoute component for role-based access control and subscription gating.
 *
 * Usage:
 * ```tsx
 * // Require specific permission
 * <ProtectedRoute requiredPermission="MANAGE_USERS">
 *   <UserManagement />
 * </ProtectedRoute>
 *
 * // Require specific roles
 * <ProtectedRoute requiredRoles={['Admin', 'Manager']}>
 *   <AdminPanel />
 * </ProtectedRoute>
 *
 * // Require active subscription
 * <ProtectedRoute requireSubscription>
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * // Just require authentication (no specific permission)
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  requiredPermission,
  requiredRoles,
  requireSubscription = false,
  redirectTo = '/access-denied',
  requireAuth = true,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const { canAccess, getSubscriptionStatus, isLoading: isSubscriptionLoading } = useSubscription()
  const location = useLocation()

  // Task 7: Only block on initial auth load, not subscription refresh
  // Subscription refresh should show a non-blocking overlay instead
  if (isLoading && !user) {
    return null
  }

  // If subscription is loading but we already have data, show children with overlay
  const showSubscriptionRefreshOverlay = requireSubscription && isSubscriptionLoading && user

  // Check if authentication is required and user is not authenticated
  if (requireAuth && !user) {
    // Redirect to login, saving the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check if subscription is required
  if (requireSubscription && !canAccess()) {
    const status = getSubscriptionStatus()

    // If subscription is past_due, allow access with warning
    if (status === 'past_due') {
      return (
        <>
          {children}
          {showSubscriptionRefreshOverlay && (
            <div className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-sm border rounded-lg p-3 shadow-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Refreshing subscription...</span>
            </div>
          )}
        </>
      )
    }

    // Otherwise, redirect to subscription required page
    return <Navigate to="/subscription-required" state={{ from: location }} replace />
  }

  // If user is authenticated and no specific permission/role required, allow access
  if (!requiredPermission && !requiredRoles) {
    return (
      <>
        {children}
        {showSubscriptionRefreshOverlay && (
          <div className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-sm border rounded-lg p-3 shadow-lg flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Refreshing subscription...</span>
          </div>
        )}
      </>
    )
  }

  // Check role-based access if requiredRoles is specified
  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasRole(user?.role, requiredRoles)) {
      return <Navigate to={redirectTo} replace />
    }
    return (
      <>
        {children}
        {showSubscriptionRefreshOverlay && (
          <div className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-sm border rounded-lg p-3 shadow-lg flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Refreshing subscription...</span>
          </div>
        )}
      </>
    )
  }

  // Check permission-based access if requiredPermission is specified
  if (requiredPermission) {
    if (!hasPermission(user?.role, requiredPermission)) {
      return <Navigate to={redirectTo} replace />
    }
  }

  return (
    <>
      {children}
      {showSubscriptionRefreshOverlay && (
        <div className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-sm border rounded-lg p-3 shadow-lg flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Refreshing subscription...</span>
        </div>
      )}
    </>
  )
}

/**
 * Higher-order component version of ProtectedRoute
 */
export function withProtectedRoute<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    )
  }
}
