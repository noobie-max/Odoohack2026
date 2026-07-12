'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

async function getUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  return session.user as { id: string; role: any; departmentId: string | null }
}

export async function createNotification(data: {
  userId: string
  type: string
  message: string
  entityType?: string
  entityId?: string
}) {
  return prisma.notification.create({ data })
}

export async function getNotifications(filter?: 'ALL' | 'ALERTS' | 'APPROVALS' | 'BOOKINGS') {
  const user = await getUser()

  const typeMap: Record<string, string[]> = {
    ALERTS: ['OVERDUE_RETURN', 'AUDIT_DISCREPANCY_FLAGGED', 'ASSET_ASSIGNED'],
    APPROVALS: [
      'TRANSFER_REQUESTED',
      'TRANSFER_APPROVED',
      'TRANSFER_REJECTED',
      'MAINTENANCE_REQUESTED',
      'MAINTENANCE_APPROVED',
      'MAINTENANCE_REJECTED',
      'MAINTENANCE_RESOLVED',
    ],
    BOOKINGS: ['BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER'],
  }

  const where: any = { userId: user.id }
  if (filter && filter !== 'ALL') {
    where.type = { in: typeMap[filter] || [] }
  }

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function markNotificationRead(notificationId: string) {
  const user = await getUser()
  await prisma.notification.update({
    where: { id: notificationId, userId: user.id },
    data: { isRead: true },
  })
  revalidatePath('/notifications')
}

export async function markAllRead() {
  const user = await getUser()
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  })
  revalidatePath('/notifications')
}

export async function getUnreadCount() {
  const user = await getUser()
  return prisma.notification.count({
    where: { userId: user.id, isRead: false },
  })
}

export async function getActivityLogs(limit = 50) {
  const user = await getUser()
  if (user.role !== 'ADMIN' && user.role !== 'ASSET_MANAGER') return []

  return prisma.activityLog.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
