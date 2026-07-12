'use server'

import { prisma } from '@/lib/prisma'
import { plain } from '@/lib/serialize'
import { can } from '@/lib/rbac'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { allocationSchema, returnSchema, transferSchema } from '@/lib/validators'
import { revalidatePath } from 'next/cache'
import { createNotification } from './notifications'

async function getUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  return session.user as { id: string; role: any; departmentId: string | null }
}

export async function allocateAsset(data: {
  assetId: string
  employeeId: string
  expectedReturnDate?: string
}) {
  const user = await getUser()
  if (!can('asset.allocate', user)) return { error: 'Unauthorized: Only Asset Managers can allocate assets.' }

  const parsed = allocationSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Check asset status
  const asset = await prisma.asset.findUnique({
    where: { id: parsed.data.assetId },
    include: {
      allocations: {
        where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
        include: { employee: { include: { department: true } } },
        take: 1,
      },
    },
  })

  if (!asset) return { error: 'Asset not found.' }

  // BUSINESS RULE §4.2: Block double allocation
  if (asset.status === 'ALLOCATED') {
    const currentAllocation = asset.allocations[0]
    const holderName = currentAllocation?.employee?.name || 'Unknown'
    const holderDept = currentAllocation?.employee?.department?.name || 'Unknown Department'
    return {
      error: `Already allocated to ${holderName} (${holderDept}). Direct re-allocation is blocked — submit a transfer request instead.`,
      blocked: true,
      currentHolder: currentAllocation?.employee,
      currentAllocation,
    }
  }

  if (asset.status === 'UNDER_MAINTENANCE') {
    return { error: 'Asset is currently under maintenance and cannot be allocated.' }
  }
  if (asset.status === 'RETIRED' || asset.status === 'DISPOSED' || asset.status === 'LOST') {
    return { error: `Asset is ${asset.status.toLowerCase()} and cannot be allocated.` }
  }

  const employee = await prisma.user.findUnique({
    where: { id: parsed.data.employeeId },
    include: { department: true },
  })
  if (!employee) return { error: 'Employee not found.' }

  // Create allocation in transaction
  const allocation = await prisma.$transaction(async (tx) => {
    const alloc = await tx.allocation.create({
      data: {
        assetId: parsed.data.assetId,
        employeeId: parsed.data.employeeId,
        departmentId: employee.departmentId,
        expectedReturnDate: parsed.data.expectedReturnDate
          ? new Date(parsed.data.expectedReturnDate)
          : null,
        status: 'ACTIVE',
      },
    })

    await tx.asset.update({
      where: { id: parsed.data.assetId },
      data: {
        status: 'ALLOCATED',
        currentHolderId: parsed.data.employeeId,
      },
    })

    return alloc
  })

  // Notifications & logs
  await createNotification({
    userId: parsed.data.employeeId,
    type: 'ASSET_ASSIGNED',
    message: `Asset ${asset.tag} (${asset.name}) has been allocated to you.`,
    entityType: 'Asset',
    entityId: asset.id,
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'asset.allocate',
      entityType: 'Allocation',
      entityId: allocation.id,
      metadata: {
        assetTag: asset.tag,
        assetName: asset.name,
        employeeId: parsed.data.employeeId,
        employeeName: employee.name,
      },
    },
  })

  revalidatePath('/allocations')
  revalidatePath('/assets')
  revalidatePath('/dashboard')
  return { success: true, allocation }
}

export async function returnAsset(data: {
  allocationId: string
  returnConditionNotes?: string
}) {
  const user = await getUser()
  if (!can('asset.return', user)) return { error: 'Unauthorized' }

  const parsed = returnSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const allocation = await prisma.allocation.findUnique({
    where: { id: parsed.data.allocationId },
    include: { asset: true, employee: true },
  })

  if (!allocation) return { error: 'Allocation not found.' }
  if (allocation.status === 'RETURNED') return { error: 'Asset already returned.' }

  await prisma.$transaction(async (tx) => {
    await tx.allocation.update({
      where: { id: parsed.data.allocationId },
      data: {
        status: 'RETURNED',
        actualReturnDate: new Date(),
        returnConditionNotes: parsed.data.returnConditionNotes || null,
      },
    })

    await tx.asset.update({
      where: { id: allocation.assetId },
      data: {
        status: 'AVAILABLE',
        currentHolderId: null,
      },
    })
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'asset.return',
      entityType: 'Allocation',
      entityId: allocation.id,
      metadata: {
        assetTag: allocation.asset.tag,
        notes: parsed.data.returnConditionNotes,
      },
    },
  })

  revalidatePath('/allocations')
  revalidatePath('/assets')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function requestTransfer(data: {
  assetId: string
  toEmployeeId: string
  reason?: string
}) {
  const user = await getUser()

  const parsed = transferSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const asset = await prisma.asset.findUnique({
    where: { id: parsed.data.assetId },
    include: {
      allocations: {
        where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
        include: { employee: true },
        take: 1,
      },
    },
  })

  if (!asset) return { error: 'Asset not found.' }

  if (asset.status !== 'ALLOCATED') {
    return { error: 'This asset has no current holder — transfers only apply to allocated assets. Use direct allocation instead.' }
  }

  const currentAllocation = asset.allocations[0]
  const fromEmployeeId = currentAllocation?.employeeId || user.id

  // Check for existing pending transfer
  const existingTransfer = await prisma.transferRequest.findFirst({
    where: { assetId: asset.id, status: 'REQUESTED' },
  })
  if (existingTransfer) return { error: 'A transfer request for this asset is already pending.' }

  const transfer = await prisma.transferRequest.create({
    data: {
      assetId: parsed.data.assetId,
      fromEmployeeId,
      toEmployeeId: parsed.data.toEmployeeId,
      reason: parsed.data.reason || null,
      status: 'REQUESTED',
    },
  })

  // Notify asset managers
  const managers = await prisma.user.findMany({
    where: { role: { in: ['ASSET_MANAGER', 'ADMIN'] } },
  })
  for (const mgr of managers) {
    await createNotification({
      userId: mgr.id,
      type: 'TRANSFER_REQUESTED',
      message: `Transfer request for ${asset.tag} (${asset.name}) submitted.`,
      entityType: 'TransferRequest',
      entityId: transfer.id,
    })
  }

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'transfer.request',
      entityType: 'TransferRequest',
      entityId: transfer.id,
      metadata: { assetTag: asset.tag, fromEmployeeId, toEmployeeId: parsed.data.toEmployeeId },
    },
  })

  revalidatePath('/allocations')
  revalidatePath('/dashboard')
  return { success: true, transfer }
}

export async function approveTransfer(transferId: string) {
  const user = await getUser()

  const transfer = await prisma.transferRequest.findUnique({
    where: { id: transferId },
    include: {
      asset: true,
      fromEmployee: { include: { department: true } },
      toEmployee: true,
    },
  })

  if (!transfer) return { error: 'Transfer not found.' }
  if (transfer.status !== 'REQUESTED') return { error: 'Transfer is not in REQUESTED state.' }

  // RBAC: ASSET_MANAGER/ADMIN always, DEPT_HEAD only for their dept
  if (
    !can('transfer.approve', user, {
      departmentId: transfer.fromEmployee?.department?.id,
    })
  ) {
    return { error: 'Unauthorized to approve this transfer.' }
  }

  await prisma.$transaction(async (tx) => {
    // Close old allocation
    await tx.allocation.updateMany({
      where: { assetId: transfer.assetId, status: { in: ['ACTIVE', 'OVERDUE'] } },
      data: {
        status: 'RETURNED',
        actualReturnDate: new Date(),
        returnConditionNotes: `Transferred to ${transfer.toEmployee.name}`,
      },
    })

    // Create new allocation
    const toEmployee = await tx.user.findUnique({ where: { id: transfer.toEmployeeId } })
    await tx.allocation.create({
      data: {
        assetId: transfer.assetId,
        employeeId: transfer.toEmployeeId,
        departmentId: toEmployee?.departmentId,
        status: 'ACTIVE',
      },
    })

    // Update asset holder + status
    await tx.asset.update({
      where: { id: transfer.assetId },
      data: { status: 'ALLOCATED', currentHolderId: transfer.toEmployeeId },
    })

    // Update transfer record
    await tx.transferRequest.update({
      where: { id: transferId },
      data: { status: 'APPROVED', approvedById: user.id, resolvedAt: new Date() },
    })
  })

  // Notifications
  await createNotification({
    userId: transfer.fromEmployeeId,
    type: 'TRANSFER_APPROVED',
    message: `Transfer of ${transfer.asset.tag} has been approved.`,
    entityType: 'TransferRequest',
    entityId: transferId,
  })
  await createNotification({
    userId: transfer.toEmployeeId,
    type: 'TRANSFER_APPROVED',
    message: `Asset ${transfer.asset.tag} (${transfer.asset.name}) has been transferred to you.`,
    entityType: 'TransferRequest',
    entityId: transferId,
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'transfer.approve',
      entityType: 'TransferRequest',
      entityId: transferId,
      metadata: { assetTag: transfer.asset.tag },
    },
  })

  revalidatePath('/allocations')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function rejectTransfer(transferId: string, reason?: string) {
  const user = await getUser()

  const transfer = await prisma.transferRequest.findUnique({
    where: { id: transferId },
    include: { asset: true, fromEmployee: { include: { department: true } } },
  })

  if (!transfer) return { error: 'Transfer not found.' }

  if (
    !can('transfer.reject', user, {
      departmentId: transfer.fromEmployee?.department?.id,
    })
  ) {
    return { error: 'Unauthorized.' }
  }

  await prisma.transferRequest.update({
    where: { id: transferId },
    data: { status: 'REJECTED', approvedById: user.id, resolvedAt: new Date() },
  })

  await createNotification({
    userId: transfer.fromEmployeeId,
    type: 'TRANSFER_REJECTED',
    message: `Transfer of ${transfer.asset.tag} has been rejected.`,
    entityType: 'TransferRequest',
    entityId: transferId,
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'transfer.reject',
      entityType: 'TransferRequest',
      entityId: transferId,
      metadata: { assetTag: transfer.asset.tag, reason },
    },
  })

  revalidatePath('/allocations')
  return { success: true }
}

export async function getActiveAllocations() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return []

  await recomputeOverdueAllocations()

  return plain(await prisma.allocation.findMany({
    where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
    include: {
      asset: { include: { category: true } },
      employee: { include: { department: true } },
    },
    orderBy: { allocatedDate: 'desc' },
  }))
}

export async function getPendingTransfers() {
  return plain(await prisma.transferRequest.findMany({
    where: { status: 'REQUESTED' },
    include: {
      asset: true,
      fromEmployee: { include: { department: true } },
      toEmployee: { include: { department: true } },
    },
    orderBy: { requestedAt: 'desc' },
  }))
}

// §4.4 Mark overdue allocations
export async function recomputeOverdueAllocations() {
  const now = new Date()
  const overdueAllocations = await prisma.allocation.findMany({
    where: {
      status: { in: ['ACTIVE', 'OVERDUE'] },
      expectedReturnDate: { lt: now },
    },
    include: { asset: true, employee: true },
  })

  if (overdueAllocations.length === 0) return { processed: 0 }

  const managers = await prisma.user.findMany({
    where: { role: { in: ['ASSET_MANAGER', 'ADMIN'] } },
  })

  for (const allocation of overdueAllocations) {
    if (allocation.status === 'ACTIVE') {
      await prisma.allocation.update({
        where: { id: allocation.id },
        data: { status: 'OVERDUE' },
      })
    }

    // Only send notification once
    if (!allocation.overdueNotifiedAt) {
      await prisma.allocation.update({
        where: { id: allocation.id },
        data: { overdueNotifiedAt: now },
      })
      const dueDate = allocation.expectedReturnDate?.toLocaleDateString()
      await createNotification({
        userId: allocation.employeeId,
        type: 'OVERDUE_RETURN',
        message: `Asset ${allocation.asset.tag} (${allocation.asset.name}) was due for return on ${dueDate}. Please return it immediately.`,
        entityType: 'Allocation',
        entityId: allocation.id,
      })
      for (const mgr of managers) {
        await createNotification({
          userId: mgr.id,
          type: 'OVERDUE_RETURN',
          message: `Asset ${allocation.asset.tag} (${allocation.asset.name}) held by ${allocation.employee.name} is overdue since ${dueDate}.`,
          entityType: 'Allocation',
          entityId: allocation.id,
        })
      }
    }
  }

  return { processed: overdueAllocations.length }
}
