'use server'

import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assetSchema } from '@/lib/validators'
import { revalidatePath } from 'next/cache'
import { AssetStatus, Prisma } from '@prisma/client'

async function getUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  return session.user as { id: string; role: any; departmentId: string | null }
}

// Auto-generate tag AF-0001, AF-0002 etc.
// Tags are zero-padded, so the lexicographic max is also the numeric max.
async function generateAssetTag(tx: any): Promise<string> {
  const last = await tx.asset.findFirst({
    where: { tag: { startsWith: 'AF-' } },
    orderBy: { tag: 'desc' },
    take: 1,
    select: { tag: true },
  })
  const lastNumber = last ? parseInt(last.tag.slice(3), 10) : 0
  const next = (Number.isNaN(lastNumber) ? 0 : lastNumber) + 1
  return `AF-${String(next).padStart(4, '0')}`
}

export async function registerAsset(data: {
  name: string
  categoryId: string
  serialNumber?: string
  acquisitionDate?: string
  acquisitionCost?: number
  condition?: string
  location?: string
  isBookable?: boolean
  departmentId?: string
  photoUrl?: string
  customFieldValues?: Record<string, string>
}) {
  const user = await getUser()
  if (!can('asset.register', user)) return { error: 'Unauthorized: Only Asset Managers can register assets.' }

  const parsed = assetSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const createWithFreshTag = () =>
    prisma.$transaction(async (tx) => {
      const tag = await generateAssetTag(tx)
      return tx.asset.create({
        data: {
          tag,
          name: parsed.data.name,
          categoryId: parsed.data.categoryId,
          serialNumber: parsed.data.serialNumber || null,
          acquisitionDate: parsed.data.acquisitionDate ? new Date(parsed.data.acquisitionDate) : null,
          acquisitionCost: parsed.data.acquisitionCost || null,
          condition: parsed.data.condition || null,
          location: parsed.data.location || null,
          isBookable: parsed.data.isBookable,
          departmentId: parsed.data.departmentId || null,
          photoUrl: parsed.data.photoUrl || null,
          customFieldValues: parsed.data.customFieldValues
            ? (parsed.data.customFieldValues as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          status: 'AVAILABLE',
        },
        include: { category: true, department: true },
      })
    })

  let asset
  try {
    asset = await createWithFreshTag()
  } catch (err) {
    // Retry once if a concurrent registration grabbed the same tag
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      asset = await createWithFreshTag()
    } else {
      throw err
    }
  }

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'asset.register',
      entityType: 'Asset',
      entityId: asset.id,
      metadata: { tag: asset.tag, name: asset.name },
    },
  })

  revalidatePath('/assets')
  return { success: true, asset }
}

export async function updateAsset(
  assetId: string,
  data: Partial<{
    name: string
    condition: string
    location: string
    isBookable: boolean
    departmentId: string | null
    photoUrl: string | null
    customFieldValues: Record<string, string> | null
  }>
) {
  const user = await getUser()
  if (!can('asset.register', user)) return { error: 'Unauthorized' }

  const { customFieldValues, ...rest } = data
  const updateData: any = { ...rest }
  if (customFieldValues !== undefined) {
    updateData.customFieldValues = customFieldValues
      ? (customFieldValues as Prisma.InputJsonValue)
      : Prisma.JsonNull
  }

  const asset = await prisma.asset.update({
    where: { id: assetId },
    data: updateData,
    include: { category: true, department: true },
  })

  revalidatePath('/assets')
  return { success: true, asset }
}

export async function getAssets(filters?: {
  search?: string
  categoryId?: string
  status?: AssetStatus
  departmentId?: string
  isBookable?: boolean
}) {
  const user = await getUser()

  const where: any = {}

  if (filters?.search) {
    where.OR = [
      { tag: { contains: filters.search, mode: 'insensitive' } },
      { name: { contains: filters.search, mode: 'insensitive' } },
      { serialNumber: { contains: filters.search, mode: 'insensitive' } },
    ]
  }
  if (filters?.categoryId) where.categoryId = filters.categoryId
  if (filters?.status) where.status = filters.status
  if (filters?.departmentId) where.departmentId = filters.departmentId
  if (filters?.isBookable !== undefined) where.isBookable = filters.isBookable

  // Role-based visibility scope, layered on top of any explicit filters
  if (user.role === 'EMPLOYEE') {
    where.AND = [
      { OR: [{ currentHolderId: user.id }, { isBookable: true }] },
    ]
  } else if (user.role === 'DEPARTMENT_HEAD') {
    const deptMembers = user.departmentId
      ? await prisma.user.findMany({
          where: { departmentId: user.departmentId },
          select: { id: true },
        })
      : []
    const scope: any[] = [{ isBookable: true }]
    if (user.departmentId) scope.push({ departmentId: user.departmentId })
    if (deptMembers.length > 0) {
      scope.push({ currentHolderId: { in: deptMembers.map((m) => m.id) } })
    }
    where.AND = [{ OR: scope }]
  }

  return prisma.asset.findMany({
    where,
    include: {
      category: true,
      department: true,
      allocations: {
        include: { employee: true },
        orderBy: { allocatedDate: 'desc' },
        take: 5,
      },
      maintenance: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { tag: 'asc' },
  })
}

export async function setAssetStatus(
  assetId: string,
  status: 'RETIRED' | 'DISPOSED' | 'LOST' | 'AVAILABLE',
  note?: string
) {
  const user = await getUser()
  if (user.role !== 'ADMIN' && user.role !== 'ASSET_MANAGER') {
    return { error: 'Unauthorized: Only Asset Managers or Admins can change asset lifecycle status.' }
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      allocations: { where: { status: { in: ['ACTIVE', 'OVERDUE'] } }, take: 1 },
    },
  })
  if (!asset) return { error: 'Asset not found.' }

  if (asset.allocations.length > 0) {
    return { error: 'Asset has an active allocation. Process the return before changing its status.' }
  }
  if (asset.status === 'UNDER_MAINTENANCE') {
    return { error: 'Asset is under maintenance. Resolve the maintenance request first.' }
  }
  if (asset.status === 'DISPOSED') {
    return { error: 'Disposed assets cannot change status.' }
  }
  if (status === 'AVAILABLE' && asset.status !== 'LOST' && asset.status !== 'RETIRED') {
    return { error: 'Only Lost or Retired assets can be restored to Available.' }
  }
  if (asset.status === status) {
    return { error: `Asset is already ${status.toLowerCase()}.` }
  }

  await prisma.asset.update({
    where: { id: assetId },
    data: { status, currentHolderId: null },
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'asset.status',
      entityType: 'Asset',
      entityId: assetId,
      metadata: { tag: asset.tag, from: asset.status, to: status, note: note || null },
    },
  })

  revalidatePath('/assets')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getAssetDetail(assetId: string) {
  return prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      category: true,
      department: true,
      allocations: {
        include: { employee: true },
        orderBy: { allocatedDate: 'desc' },
      },
      maintenance: {
        include: { raisedBy: true, approvedBy: true },
        orderBy: { createdAt: 'desc' },
      },
      transfers: {
        include: { fromEmployee: true, toEmployee: true, approvedBy: true },
        orderBy: { requestedAt: 'desc' },
      },
    },
  })
}
