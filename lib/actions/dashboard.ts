'use server'

import { prisma } from '@/lib/prisma'

export async function getDashboardKPIs() {
  const now = new Date()

  const [
    availableCount,
    allocatedCount,
    underMaintenanceCount,
    activeBookings,
    pendingTransfers,
    overdueAllocations,
    recentActivity,
    pendingMaintenance,
    upcomingReturns,
  ] = await Promise.all([
    prisma.asset.count({ where: { status: 'AVAILABLE' } }),
    prisma.asset.count({ where: { status: 'ALLOCATED' } }),
    prisma.asset.count({ where: { status: 'UNDER_MAINTENANCE' } }),
    prisma.booking.count({
      where: {
        status: { in: ['UPCOMING', 'ONGOING'] },
        endTime: { gt: now },
      },
    }),
    prisma.transferRequest.count({ where: { status: 'REQUESTED' } }),
    prisma.allocation.count({
      where: {
        status: { in: ['ACTIVE', 'OVERDUE'] },
        expectedReturnDate: { lt: now },
      },
    }),
    prisma.activityLog.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.maintenanceRequest.count({ where: { status: 'PENDING' } }),
    prisma.allocation.findMany({
      where: {
        status: 'ACTIVE',
        expectedReturnDate: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // next 7 days
        },
      },
      include: {
        asset: true,
        employee: true,
      },
      orderBy: { expectedReturnDate: 'asc' },
      take: 5,
    }),
  ])

  return {
    availableCount,
    allocatedCount,
    underMaintenanceCount,
    activeBookings,
    pendingTransfers,
    overdueCount: overdueAllocations,
    pendingMaintenance,
    upcomingReturns,
    recentActivity: recentActivity.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
      userName: log.user.name,
      createdAt: log.createdAt,
    })),
  }
}
