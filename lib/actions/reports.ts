'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function getUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  return session.user as { id: string; role: any; departmentId: string | null }
}

export async function getReportsData() {
  const user = await getUser()
  if (user.role !== 'ADMIN' && user.role !== 'ASSET_MANAGER' && user.role !== 'DEPARTMENT_HEAD') {
    throw new Error('Unauthorized')
  }

  // Department Heads see everything scoped to their department where data has a
  // department dimension; bookings stay global.
  const deptId = user.role === 'DEPARTMENT_HEAD' ? user.departmentId : null
  const assetScope: any = deptId ? { departmentId: deptId } : {}
  const maintenanceScope: any = deptId ? { asset: { departmentId: deptId } } : {}

  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Utilization by department
  const deptUtilization = await prisma.department.findMany({
    where: { status: 'ACTIVE', ...(deptId ? { id: deptId } : {}) },
    include: {
      assets: { select: { id: true, status: true } },
    },
  })

  const utilizationData = deptUtilization.map((d) => ({
    name: d.name,
    total: d.assets.length,
    allocated: d.assets.filter((a) => a.status === 'ALLOCATED').length,
    available: d.assets.filter((a) => a.status === 'AVAILABLE').length,
    maintenance: d.assets.filter((a) => a.status === 'UNDER_MAINTENANCE').length,
  }))

  // Most used bookable resources (bookings are global)
  const mostBookedRaw = await prisma.asset.findMany({
    where: { isBookable: true },
    select: {
      id: true,
      tag: true,
      name: true,
      status: true,
      location: true,
      category: { select: { name: true } },
      _count: { select: { bookings: true } },
    },
    orderBy: { bookings: { _count: 'desc' } },
    take: 10,
  })
  const mostBookedAssets = mostBookedRaw.map((a) => ({
    id: a.id,
    tag: a.tag,
    name: a.name,
    status: a.status,
    location: a.location,
    category: { name: a.category.name },
    _count: { bookings: a._count.bookings },
  }))

  // Idle assets (no allocation in the last 30 days)
  const idleRaw = await prisma.asset.findMany({
    where: {
      ...assetScope,
      status: 'AVAILABLE',
      allocations: {
        none: { allocatedDate: { gte: thirtyDaysAgo } },
      },
    },
    select: {
      id: true,
      tag: true,
      name: true,
      status: true,
      condition: true,
      location: true,
      category: { select: { name: true } },
    },
    take: 10,
  })
  const idleAssets = idleRaw.map((a) => ({
    id: a.id,
    tag: a.tag,
    name: a.name,
    status: a.status,
    condition: a.condition,
    location: a.location,
    category: { name: a.category.name },
  }))

  // Assets needing attention (damaged or under maintenance)
  const needsAttentionRaw = await prisma.asset.findMany({
    where: {
      ...assetScope,
      OR: [{ condition: 'Damaged' }, { status: 'UNDER_MAINTENANCE' }],
    },
    select: {
      id: true,
      tag: true,
      name: true,
      status: true,
      condition: true,
      location: true,
      category: { select: { name: true } },
      maintenance: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true, priority: true, issueDescription: true },
      },
    },
    take: 10,
  })
  const needsAttention = needsAttentionRaw.map((a) => ({
    id: a.id,
    tag: a.tag,
    name: a.name,
    status: a.status,
    condition: a.condition,
    location: a.location,
    category: { name: a.category.name },
    latestMaintenance: a.maintenance[0] || null,
  }))

  // Allocation trends — allocations created per month, last 6 months
  const monthBuckets: { key: string; month: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthBuckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleString('en-US', { month: 'short' }),
      count: 0,
    })
  }
  const recentAllocations = await prisma.allocation.findMany({
    where: {
      allocatedDate: { gte: sixMonthsAgo },
      ...(deptId ? { asset: { departmentId: deptId } } : {}),
    },
    select: { allocatedDate: true },
  })
  for (const alloc of recentAllocations) {
    const key = `${alloc.allocatedDate.getFullYear()}-${alloc.allocatedDate.getMonth()}`
    const bucket = monthBuckets.find((m) => m.key === key)
    if (bucket) bucket.count++
  }
  const allocationTrends = monthBuckets.map(({ month, count }) => ({ month, count }))

  // Maintenance requests by asset category
  const maintenanceWithCategory = await prisma.maintenanceRequest.findMany({
    where: maintenanceScope,
    select: {
      asset: { select: { category: { select: { name: true } } } },
    },
  })
  const categoryCounts = new Map<string, number>()
  for (const req of maintenanceWithCategory) {
    const name = req.asset.category.name
    categoryCounts.set(name, (categoryCounts.get(name) || 0) + 1)
  }
  const maintenanceByCategory = Array.from(categoryCounts.entries()).map(
    ([category, count]) => ({ category, count })
  )

  // Booking heatmap — last 30 days, bucketed by weekday (0-6) and start hour
  const recentBookings = await prisma.booking.findMany({
    where: {
      startTime: { gte: thirtyDaysAgo },
      status: { in: ['UPCOMING', 'ONGOING', 'COMPLETED'] },
    },
    select: { startTime: true },
  })
  const heatCounts = new Map<string, number>()
  for (const booking of recentBookings) {
    const key = `${booking.startTime.getDay()}-${booking.startTime.getHours()}`
    heatCounts.set(key, (heatCounts.get(key) || 0) + 1)
  }
  const bookingHeatmap = Array.from(heatCounts.entries()).map(([key, count]) => {
    const [day, hour] = key.split('-').map(Number)
    return { day, hour, count }
  })

  // Asset counts per lifecycle status
  const statusGroups = await prisma.asset.groupBy({
    by: ['status'],
    where: assetScope,
    _count: { _all: true },
  })
  const statusBreakdown = statusGroups.map((g) => ({
    status: g.status,
    count: g._count._all,
  }))

  // Summary counts
  const [totalAssets, totalAllocated, totalBookings, totalMaintenance] = await Promise.all([
    prisma.asset.count({ where: assetScope }),
    prisma.asset.count({ where: { ...assetScope, status: 'ALLOCATED' } }),
    prisma.booking.count({ where: { status: { in: ['UPCOMING', 'ONGOING', 'COMPLETED'] } } }),
    prisma.maintenanceRequest.count({ where: maintenanceScope }),
  ])

  return {
    utilizationData,
    mostBookedAssets,
    idleAssets,
    needsAttention,
    allocationTrends,
    maintenanceByCategory,
    bookingHeatmap,
    statusBreakdown,
    summaryStats: { totalAssets, totalAllocated, totalBookings, totalMaintenance },
  }
}
