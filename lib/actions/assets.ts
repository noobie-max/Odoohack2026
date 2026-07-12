'use server'

import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assetSchema } from '@/lib/validators'
import { revalidatePath } from 'next/cache'
import { AssetStatus } from '@prisma/client'

async function getUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  return session.user as { id: string; role: any; departmentId: string | null }
}

// Auto-generate tag AF-0001, AF-0002 etc.
async function generateAssetTag(tx: any): Promise<string> {
  const count = await tx.asset.count()
  const next = count + 1
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
}) {
  const user = await getUser()
  if (!can('asset.register', user)) return { error: 'Unauthorized: Only Asset Managers can register assets.' }

  const parsed = assetSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const asset = await prisma.$transaction(async (tx) => {
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
        status: 'AVAILABLE',
      },
      include: { category: true, department: true },
    })
  })

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
  }>
) {
  const user = await getUser()
  if (!can('asset.register', user)) return { error: 'Unauthorized' }

  const asset = await prisma.asset.update({
    where: { id: assetId },
    data,
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
