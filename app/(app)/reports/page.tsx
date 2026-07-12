import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ReportsClient } from './ReportsClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Utilization by department
  const deptUtilization = await prisma.department.findMany({
    where: { status: 'ACTIVE' },
    include: {
      assets: { select: { id: true, status: true } },
    },
  })

  const utilizationData = deptUtilization.map(d => ({
    name: d.name,
    total: d.assets.length,
    allocated: d.assets.filter(a => a.status === 'ALLOCATED').length,
    available: d.assets.filter(a => a.status === 'AVAILABLE').length,
    maintenance: d.assets.filter(a => a.status === 'UNDER_MAINTENANCE').length,
  }))

  // Maintenance frequency by month (last 6 months)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const maintenanceByMonth = await prisma.maintenanceRequest.groupBy({
    by: ['createdAt'],
    where: { createdAt: { gte: sixMonthsAgo } },
    _count: true,
  })

  // Most used assets (by booking count)
  const mostBookedAssets = await prisma.asset.findMany({
    where: { isBookable: true },
    include: {
      _count: { select: { bookings: true } },
      category: true,
    },
    orderBy: { bookings: { _count: 'desc' } },
    take: 10,
  })

  // Idle assets (no allocation in last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const idleAssets = await prisma.asset.findMany({
    where: {
      status: 'AVAILABLE',
      allocations: {
        none: { allocatedDate: { gte: thirtyDaysAgo } },
      },
    },
    include: { category: true },
    take: 10,
  })

  // Assets needing maintenance (condition = Damaged or under maintenance)
  const needsMaintenance = await prisma.asset.findMany({
    where: {
      OR: [
        { condition: 'Damaged' },
        { status: 'UNDER_MAINTENANCE' },
      ],
    },
    include: { category: true, maintenance: { orderBy: { createdAt: 'desc' }, take: 1 } },
    take: 10,
  })

  // Summary counts
  const [totalAssets, totalAllocated, totalBookings, totalMaintenance] = await Promise.all([
    prisma.asset.count(),
    prisma.asset.count({ where: { status: 'ALLOCATED' } }),
    prisma.booking.count({ where: { status: { in: ['UPCOMING', 'ONGOING', 'COMPLETED'] } } }),
    prisma.maintenanceRequest.count(),
  ])

  return (
    <ReportsClient
      utilizationData={utilizationData}
      mostBookedAssets={mostBookedAssets as any}
      idleAssets={idleAssets as any}
      needsMaintenance={needsMaintenance as any}
      summaryStats={{ totalAssets, totalAllocated, totalBookings, totalMaintenance }}
    />
  )
}
