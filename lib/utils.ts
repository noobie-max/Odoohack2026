import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export const assetStatusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800 border-green-200',
  ALLOCATED: 'bg-blue-100 text-blue-800 border-blue-200',
  RESERVED: 'bg-amber-100 text-amber-800 border-amber-200',
  UNDER_MAINTENANCE: 'bg-orange-100 text-orange-800 border-orange-200',
  LOST: 'bg-red-100 text-red-800 border-red-200',
  RETIRED: 'bg-gray-100 text-gray-600 border-gray-200',
  DISPOSED: 'bg-gray-100 text-gray-500 border-gray-200',
}

export const allocationStatusColors: Record<string, string> = {
  ACTIVE: 'bg-blue-100 text-blue-800 border-blue-200',
  RETURNED: 'bg-green-100 text-green-800 border-green-200',
  OVERDUE: 'bg-red-100 text-red-800 border-red-200',
}

export const maintenanceStatusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-blue-100 text-blue-800 border-blue-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  TECHNICIAN_ASSIGNED: 'bg-purple-100 text-purple-800 border-purple-200',
  IN_PROGRESS: 'bg-orange-100 text-orange-800 border-orange-200',
  RESOLVED: 'bg-green-100 text-green-800 border-green-200',
}

export const transferStatusColors: Record<string, string> = {
  REQUESTED: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
}

export const bookingStatusColors: Record<string, string> = {
  UPCOMING: 'bg-blue-100 text-blue-800 border-blue-200',
  ONGOING: 'bg-green-100 text-green-800 border-green-200',
  COMPLETED: 'bg-gray-100 text-gray-600 border-gray-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
}

export const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export function friendlyActionLabel(action: string, metadata?: any): string {
  const labels: Record<string, string> = {
    'asset.register': `Registered asset ${metadata?.tag || ''}`,
    'asset.allocate': `Allocated ${metadata?.assetTag || ''} to ${metadata?.employeeName || ''}`,
    'asset.return': `Returned ${metadata?.assetTag || ''}`,
    'transfer.request': `Transfer requested for ${metadata?.assetTag || ''}`,
    'transfer.approve': `Transfer approved for ${metadata?.assetTag || ''}`,
    'transfer.reject': `Transfer rejected for ${metadata?.assetTag || ''}`,
    'booking.create': `Booked ${metadata?.assetName || ''}`,
    'booking.cancel': `Cancelled booking for ${metadata?.assetName || ''}`,
    'maintenance.raise': `Maintenance raised for ${metadata?.assetTag || ''}`,
    'maintenance.approve': `Maintenance approved for ${metadata?.assetTag || ''}`,
    'maintenance.reject': `Maintenance rejected for ${metadata?.assetTag || ''}`,
    'maintenance.assign': `Technician assigned for ${metadata?.assetTag || ''}`,
    'maintenance.resolve': `Maintenance resolved for ${metadata?.assetTag || ''}`,
    'audit.create': `Audit cycle created: ${metadata?.name || ''}`,
    'audit.verify': `Asset ${metadata?.assetTag || ''} verified as ${metadata?.status || ''}`,
    'audit.close': `Audit cycle closed: ${metadata?.name || ''}`,
    'user.promote': `Role changed to ${metadata?.newRole || ''}`,
    'dept.create': `Department created: ${metadata?.name || ''}`,
    'category.create': `Category created: ${metadata?.name || ''}`,
  }
  return labels[action] || action
}
