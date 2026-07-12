import { Role } from '@prisma/client'

type UserSession = {
  id: string
  role: Role
  departmentId?: string | null
}

type Resource = {
  departmentId?: string | null
  employeeId?: string | null
  fromEmployeeId?: string | null
  userId?: string | null
}

export function can(
  action: string,
  user: UserSession,
  resource?: Resource
): boolean {
  const role = user.role

  switch (action) {
    // Asset viewing
    case 'asset.view':
      return true // All roles can view, filtered by their scope

    // Asset registration / allocation
    case 'asset.register':
    case 'asset.allocate':
    case 'asset.return':
      return role === 'ASSET_MANAGER' || role === 'ADMIN'

    // Transfer approval
    case 'transfer.approve':
    case 'transfer.reject':
      if (role === 'ASSET_MANAGER' || role === 'ADMIN') return true
      // Dept Head can only approve transfers from their own department
      if (role === 'DEPARTMENT_HEAD' && resource) {
        return (
          !!user.departmentId &&
          resource.departmentId === user.departmentId
        )
      }
      return false

    // Transfer request (anyone can raise)
    case 'transfer.request':
      return true

    // Booking (all roles)
    case 'booking.create':
    case 'booking.cancel':
      return true

    // Maintenance request (all roles)
    case 'maintenance.raise':
      return true

    // Maintenance approval
    case 'maintenance.approve':
    case 'maintenance.reject':
    case 'maintenance.assign':
    case 'maintenance.progress':
    case 'maintenance.resolve':
      return role === 'ASSET_MANAGER' || role === 'ADMIN'

    // Org management
    case 'org.manage':
    case 'dept.manage':
    case 'category.manage':
      return role === 'ADMIN'

    // Role promotion
    case 'user.promote':
      return role === 'ADMIN'

    // Audit
    case 'audit.create':
    case 'audit.close':
      return role === 'ASSET_MANAGER' || role === 'ADMIN'

    case 'audit.verify':
      return true // Auditors (any user assigned)

    // Reports/analytics
    case 'reports.view':
      return role === 'ASSET_MANAGER' || role === 'ADMIN'

    case 'reports.view.dept':
      return (
        role === 'DEPARTMENT_HEAD' ||
        role === 'ASSET_MANAGER' ||
        role === 'ADMIN'
      )

    // Activity logs
    case 'logs.view':
      return role === 'ASSET_MANAGER' || role === 'ADMIN'

    default:
      return false
  }
}
