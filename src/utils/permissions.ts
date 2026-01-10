/**
 * Role-Based Access Control (RBAC) Permissions
 *
 * This module defines permissions for different user roles in the MES system.
 * Roles are matched case-insensitively and support both frontend User type roles
 * and backend API roles.
 */

// User roles as defined in the system
export type UserRole = 'Admin' | 'Operator' | 'Maintenance' | 'Quality' | 'Viewer' | 'admin' | 'operator' | 'manager'

// Permission definitions mapping permission names to allowed roles
export const PERMISSIONS = {
  // Dashboard access
  VIEW_DASHBOARD: ['Admin', 'Operator', 'Maintenance', 'Quality', 'Viewer', 'admin', 'operator', 'manager'],

  // Machine management
  VIEW_MACHINES: ['Admin', 'Operator', 'Maintenance', 'Quality', 'Viewer', 'admin', 'operator', 'manager'],
  MANAGE_MACHINES: ['Admin', 'Operator', 'Maintenance', 'admin', 'operator'],

  // SPC Analysis
  VIEW_SPC: ['Admin', 'Quality', 'Viewer', 'admin', 'manager'],
  MANAGE_SPC: ['Admin', 'Quality', 'admin'],

  // Alarms
  VIEW_ALARMS: ['Admin', 'Operator', 'Maintenance', 'Quality', 'Viewer', 'admin', 'operator', 'manager'],
  MANAGE_ALARMS: ['Admin', 'Operator', 'Maintenance', 'admin', 'operator'],
  ACKNOWLEDGE_ALARMS: ['Admin', 'Operator', 'Maintenance', 'admin', 'operator'],

  // Maintenance
  VIEW_MAINTENANCE: ['Admin', 'Maintenance', 'admin', 'manager'],
  MANAGE_MAINTENANCE: ['Admin', 'Maintenance', 'admin'],

  // IoT Data
  VIEW_IOT_DATA: ['Admin', 'Operator', 'Maintenance', 'admin', 'operator'],

  // Administration
  MANAGE_USERS: ['Admin', 'admin'],
  MANAGE_DEVICES: ['Admin', 'admin'],
  MANAGE_FACTORIES: ['Admin', 'admin'],

  // Settings
  VIEW_SETTINGS: ['Admin', 'Operator', 'Maintenance', 'Quality', 'Viewer', 'admin', 'operator', 'manager'],
  MANAGE_SETTINGS: ['Admin', 'admin'],
} as const

export type Permission = keyof typeof PERMISSIONS

/**
 * Check if a user role has a specific permission
 * @param userRole - The role of the current user
 * @param permission - The permission to check
 * @returns boolean indicating if the user has the permission
 */
export function hasPermission(userRole: string | undefined | null, permission: Permission): boolean {
  if (!userRole) return false

  const allowedRoles = PERMISSIONS[permission]
  return allowedRoles.some(
    (role) => role.toLowerCase() === userRole.toLowerCase()
  )
}

/**
 * Check if a user role has all of the specified permissions
 * @param userRole - The role of the current user
 * @param permissions - Array of permissions to check
 * @returns boolean indicating if the user has all permissions
 */
export function hasAllPermissions(userRole: string | undefined | null, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(userRole, permission))
}

/**
 * Check if a user role has any of the specified permissions
 * @param userRole - The role of the current user
 * @param permissions - Array of permissions to check
 * @returns boolean indicating if the user has at least one permission
 */
export function hasAnyPermission(userRole: string | undefined | null, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(userRole, permission))
}

/**
 * Check if a user role is one of the specified roles
 * @param userRole - The role of the current user
 * @param allowedRoles - Array of roles to check against
 * @returns boolean indicating if the user's role is in the allowed list
 */
export function hasRole(userRole: string | undefined | null, allowedRoles: string[]): boolean {
  if (!userRole) return false

  return allowedRoles.some(
    (role) => role.toLowerCase() === userRole.toLowerCase()
  )
}

/**
 * Get all permissions for a given role
 * @param userRole - The role to get permissions for
 * @returns Array of permission names the role has
 */
export function getPermissionsForRole(userRole: string): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((permission) =>
    hasPermission(userRole, permission)
  )
}

/**
 * Check if a role is an admin role
 * @param userRole - The role to check
 * @returns boolean indicating if the role is an admin
 */
export function isAdmin(userRole: string | undefined | null): boolean {
  if (!userRole) return false
  return ['Admin', 'admin'].includes(userRole)
}
