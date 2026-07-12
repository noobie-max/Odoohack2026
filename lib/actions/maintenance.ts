'use server'

import { prisma } from '@/lib/prisma'
import { plain } from '@/lib/serialize'
import { can } from '@/lib/rbac'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { maintenanceSchema } from '@/lib/validators'
import { revalidatePath } from 'next/cache'
import { createNotification } from './notifications'

async function getUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  return session.user as { id: string; role: any; departmentId: string | null }
}

export async function raiseMaintenanceRequest(data: {
  assetId: string
  issueDescription: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}) {
  const user = await getUser()

  const parsed = maintenanceSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const asset = await prisma.asset.findUnique({ where: { id: parsed.data.assetId } })
  if (!asset) return { error: 'Asset not found.' }

  // Raising a request NEVER changes asset status (§4.6)
  const request = await prisma.maintenanceRequest.create({
    data: {
      assetId: parsed.data.assetId,
      raisedById: user.id,
      issueDescription: parsed.data.issueDescription,
      priority: parsed.data.priority || 'MEDIUM',
      status: 'PENDING',
    },
  })

  // Notify asset managers
  const managers = await prisma.user.findMany({
    where: { role: { in: ['ASSET_MANAGER', 'ADMIN'] } },
  })
  for (const mgr of managers) {
    await createNotification({
      userId: mgr.id,
      type: 'MAINTENANCE_REQUESTED',
      message: `New maintenance request for ${asset.tag} — ${parsed.data.priority || 'MEDIUM'} priority.`,
      entityType: 'MaintenanceRequest',
      entityId: request.id,
    })
  }

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'maintenance.raise',
      entityType: 'MaintenanceRequest',
      entityId: request.id,
      metadata: { assetTag: asset.tag, priority: parsed.data.priority },
    },
  })

  revalidatePath('/maintenance')
  revalidatePath('/dashboard')
  return { success: true, request }
}

export async function approveMaintenanceRequest(requestId: string) {
  const user = await getUser()
  // §4.6: Only ASSET_MANAGER or ADMIN can approve
  if (!can('maintenance.approve', user)) return { error: 'Unauthorized.' }

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: { asset: true, raisedBy: true },
  })

  if (!request) return { error: 'Request not found.' }
  if (request.status !== 'PENDING') return { error: 'Request is not pending.' }

  // Snapshot current holder before maintenance
  const currentAllocation = await prisma.allocation.findFirst({
    where: { assetId: request.assetId, status: { in: ['ACTIVE', 'OVERDUE'] } },
  })

  await prisma.$transaction(async (tx) => {
    await tx.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approvedById: user.id,
        preMaintenanceHolderId: currentAllocation?.employeeId || null,
      },
    })

    // Close the holder's allocation while the asset is in the shop
    if (currentAllocation) {
      await tx.allocation.update({
        where: { id: currentAllocation.id },
        data: {
          status: 'RETURNED',
          actualReturnDate: new Date(),
          returnConditionNotes: 'Sent to maintenance',
        },
      })
    }

    // §4.6: On APPROVED → asset status becomes UNDER_MAINTENANCE — the ONLY path to this status
    await tx.asset.update({
      where: { id: request.assetId },
      data: { status: 'UNDER_MAINTENANCE', currentHolderId: null },
    })
  })

  await createNotification({
    userId: request.raisedById,
    type: 'MAINTENANCE_APPROVED',
    message: `Your maintenance request for ${request.asset.tag} has been approved. Asset is now Under Maintenance.`,
    entityType: 'MaintenanceRequest',
    entityId: requestId,
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'maintenance.approve',
      entityType: 'MaintenanceRequest',
      entityId: requestId,
      metadata: { assetTag: request.asset.tag },
    },
  })

  revalidatePath('/maintenance')
  revalidatePath('/assets')
  return { success: true }
}

export async function rejectMaintenanceRequest(requestId: string) {
  const user = await getUser()
  if (!can('maintenance.reject', user)) return { error: 'Unauthorized.' }

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: { asset: true, raisedBy: true },
  })

  if (!request) return { error: 'Request not found.' }

  // §4.6: REJECTED never touches asset status
  await prisma.maintenanceRequest.update({
    where: { id: requestId },
    data: { status: 'REJECTED', approvedById: user.id },
  })

  await createNotification({
    userId: request.raisedById,
    type: 'MAINTENANCE_REJECTED',
    message: `Your maintenance request for ${request.asset.tag} has been rejected.`,
    entityType: 'MaintenanceRequest',
    entityId: requestId,
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'maintenance.reject',
      entityType: 'MaintenanceRequest',
      entityId: requestId,
    },
  })

  revalidatePath('/maintenance')
  return { success: true }
}

export async function assignTechnician(requestId: string, technicianName: string) {
  const user = await getUser()
  if (!can('maintenance.assign', user)) return { error: 'Unauthorized.' }

  const request = await prisma.maintenanceRequest.findUnique({ where: { id: requestId } })
  if (!request) return { error: 'Request not found.' }
  if (request.status !== 'APPROVED') return { error: 'Request must be in APPROVED state first.' }

  await prisma.maintenanceRequest.update({
    where: { id: requestId },
    data: { status: 'TECHNICIAN_ASSIGNED', technicianName },
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'maintenance.assign',
      entityType: 'MaintenanceRequest',
      entityId: requestId,
      metadata: { technicianName },
    },
  })

  revalidatePath('/maintenance')
  return { success: true }
}

export async function startMaintenanceProgress(requestId: string) {
  const user = await getUser()
  if (!can('maintenance.progress', user)) return { error: 'Unauthorized.' }

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: { asset: true },
  })
  if (!request) return { error: 'Request not found.' }

  await prisma.maintenanceRequest.update({
    where: { id: requestId },
    data: { status: 'IN_PROGRESS' },
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'maintenance.progress',
      entityType: 'MaintenanceRequest',
      entityId: requestId,
      metadata: { assetTag: request.asset.tag, technicianName: request.technicianName },
    },
  })

  revalidatePath('/maintenance')
  return { success: true }
}

export async function resolveMaintenanceRequest(requestId: string) {
  const user = await getUser()
  if (!can('maintenance.resolve', user)) return { error: 'Unauthorized.' }

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: { asset: true, raisedBy: true },
  })

  if (!request) return { error: 'Request not found.' }

  await prisma.$transaction(async (tx) => {
    await tx.maintenanceRequest.update({
      where: { id: requestId },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    })

    // §4.6: On RESOLVED → asset returns to AVAILABLE
    // (If preMaintenanceHolderId is set, asset returns to AVAILABLE and can be re-allocated)
    await tx.asset.update({
      where: { id: request.assetId },
      data: { status: 'AVAILABLE' },
    })
  })

  await createNotification({
    userId: request.raisedById,
    type: 'MAINTENANCE_RESOLVED',
    message: `Maintenance for ${request.asset.tag} has been resolved. Asset is now Available.`,
    entityType: 'MaintenanceRequest',
    entityId: requestId,
  })

  if (request.preMaintenanceHolderId && request.preMaintenanceHolderId !== request.raisedById) {
    await createNotification({
      userId: request.preMaintenanceHolderId,
      type: 'MAINTENANCE_RESOLVED',
      message: `Asset ${request.asset.tag} (${request.asset.name}) is back from maintenance and available again.`,
      entityType: 'MaintenanceRequest',
      entityId: requestId,
    })
  }

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'maintenance.resolve',
      entityType: 'MaintenanceRequest',
      entityId: requestId,
      metadata: { assetTag: request.asset.tag },
    },
  })

  revalidatePath('/maintenance')
  revalidatePath('/assets')
  return { success: true }
}

export async function getMaintenanceRequests() {
  return plain(await prisma.maintenanceRequest.findMany({
    include: {
      asset: { include: { category: true } },
      raisedBy: { include: { department: true } },
      approvedBy: true,
    },
    orderBy: { createdAt: 'desc' },
  }))
}
