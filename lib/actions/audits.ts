'use server'

import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { auditCycleSchema, auditItemSchema } from '@/lib/validators'
import { revalidatePath } from 'next/cache'
import { createNotification } from './notifications'

async function getUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  return session.user as { id: string; role: any; departmentId: string | null }
}

export async function createAuditCycle(data: {
  name: string
  scopeDepartmentId?: string
  scopeLocation?: string
  startDate: string
  endDate: string
  auditorIds: string[]
}) {
  const user = await getUser()
  if (!can('audit.create', user)) return { error: 'Unauthorized.' }

  const parsed = auditCycleSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Build asset scope filter
  const assetWhere: any = {}
  if (parsed.data.scopeDepartmentId) assetWhere.departmentId = parsed.data.scopeDepartmentId
  if (parsed.data.scopeLocation) assetWhere.location = { contains: parsed.data.scopeLocation, mode: 'insensitive' }

  const assets = await prisma.asset.findMany({
    where: Object.keys(assetWhere).length > 0 ? assetWhere : undefined,
    select: { id: true, location: true },
  })

  const cycle = await prisma.$transaction(async (tx) => {
    const newCycle = await tx.auditCycle.create({
      data: {
        name: parsed.data.name,
        scopeDepartmentId: parsed.data.scopeDepartmentId || null,
        scopeLocation: parsed.data.scopeLocation || null,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        status: 'OPEN',
        auditors: { connect: parsed.data.auditorIds.map((id) => ({ id })) },
      },
    })

    // Auto-populate AuditItem rows for every matching asset
    if (assets.length > 0) {
      await tx.auditItem.createMany({
        data: assets.map((asset) => ({
          auditCycleId: newCycle.id,
          assetId: asset.id,
          expectedLocation: asset.location,
          verificationStatus: 'PENDING',
        })),
      })
    }

    return newCycle
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'audit.create',
      entityType: 'AuditCycle',
      entityId: cycle.id,
      metadata: { name: cycle.name, assetCount: assets.length },
    },
  })

  revalidatePath('/audits')
  return { success: true, cycle, assetCount: assets.length }
}

export async function updateAuditItem(data: {
  auditItemId: string
  verificationStatus: 'PENDING' | 'VERIFIED' | 'MISSING' | 'DAMAGED'
  notes?: string
}) {
  const user = await getUser()

  const parsed = auditItemSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const item = await prisma.auditItem.findUnique({
    where: { id: parsed.data.auditItemId },
    include: { auditCycle: true, asset: true },
  })

  if (!item) return { error: 'Audit item not found.' }
  if (item.auditCycle.status === 'CLOSED') return { error: 'This audit cycle is closed and read-only.' }

  await prisma.auditItem.update({
    where: { id: parsed.data.auditItemId },
    data: {
      verificationStatus: parsed.data.verificationStatus,
      notes: parsed.data.notes || null,
    },
  })

  // Notify if flagged as MISSING or DAMAGED
  if (parsed.data.verificationStatus === 'MISSING' || parsed.data.verificationStatus === 'DAMAGED') {
    const managers = await prisma.user.findMany({
      where: { role: { in: ['ASSET_MANAGER', 'ADMIN'] } },
    })
    for (const mgr of managers) {
      await createNotification({
        userId: mgr.id,
        type: 'AUDIT_DISCREPANCY_FLAGGED',
        message: `Audit discrepancy: Asset ${item.asset.tag} flagged as ${parsed.data.verificationStatus} in "${item.auditCycle.name}".`,
        entityType: 'AuditItem',
        entityId: item.id,
      })
    }
  }

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'audit.verify',
      entityType: 'AuditItem',
      entityId: parsed.data.auditItemId,
      metadata: { status: parsed.data.verificationStatus, assetTag: item.asset.tag },
    },
  })

  revalidatePath('/audits')
  return { success: true }
}

export async function closeAuditCycle(cycleId: string) {
  const user = await getUser()
  if (!can('audit.close', user)) return { error: 'Unauthorized.' }

  const cycle = await prisma.auditCycle.findUnique({
    where: { id: cycleId },
    include: {
      items: { include: { asset: true } },
    },
  })

  if (!cycle) return { error: 'Audit cycle not found.' }
  if (cycle.status === 'CLOSED') return { error: 'Cycle is already closed.' }

  const missingItems = cycle.items.filter((i) => i.verificationStatus === 'MISSING')
  const damagedItems = cycle.items.filter((i) => i.verificationStatus === 'DAMAGED')

  await prisma.$transaction(async (tx) => {
    // §4.7 HARD GATE: Close cycle — no further edits
    await tx.auditCycle.update({
      where: { id: cycleId },
      data: { status: 'CLOSED' },
    })

    // §4.7: Cascade MISSING items → asset.status = LOST
    for (const item of missingItems) {
      await tx.asset.update({
        where: { id: item.assetId },
        data: { status: 'LOST' },
      })
    }

    // §4.7: DAMAGED items → optionally set condition
    for (const item of damagedItems) {
      await tx.asset.update({
        where: { id: item.assetId },
        data: { condition: 'Damaged' },
      })
    }
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'audit.close',
      entityType: 'AuditCycle',
      entityId: cycleId,
      metadata: {
        name: cycle.name,
        missingCount: missingItems.length,
        damagedCount: damagedItems.length,
      },
    },
  })

  revalidatePath('/audits')
  revalidatePath('/assets')
  return {
    success: true,
    missingCount: missingItems.length,
    damagedCount: damagedItems.length,
  }
}

export async function getAuditCycles() {
  return prisma.auditCycle.findMany({
    include: {
      auditors: true,
      items: {
        include: { asset: { include: { category: true } } },
      },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getAuditCycleDetail(cycleId: string) {
  return prisma.auditCycle.findUnique({
    where: { id: cycleId },
    include: {
      auditors: true,
      items: {
        include: {
          asset: { include: { category: true, department: true } },
        },
        orderBy: { asset: { tag: 'asc' } },
      },
    },
  })
}
