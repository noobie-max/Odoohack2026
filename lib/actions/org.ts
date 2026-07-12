'use server'

import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { departmentSchema, categorySchema, promoteUserSchema } from '@/lib/validators'
import { revalidatePath } from 'next/cache'

async function getUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  return session.user as { id: string; role: any; departmentId: string | null }
}

// Departments
export async function createDepartment(data: {
  name: string
  headId?: string
  parentId?: string
  status?: 'ACTIVE' | 'INACTIVE'
}) {
  const user = await getUser()
  if (!can('dept.manage', user)) return { error: 'Unauthorized' }

  const parsed = departmentSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const dept = await prisma.department.create({
    data: {
      name: parsed.data.name,
      headId: parsed.data.headId || null,
      parentId: parsed.data.parentId || null,
      status: parsed.data.status || 'ACTIVE',
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'dept.create',
      entityType: 'Department',
      entityId: dept.id,
      metadata: { name: dept.name },
    },
  })

  revalidatePath('/org-setup')
  return { success: true, dept }
}

export async function updateDepartment(
  deptId: string,
  data: { name?: string; headId?: string | null; parentId?: string | null; status?: 'ACTIVE' | 'INACTIVE' }
) {
  const user = await getUser()
  if (!can('dept.manage', user)) return { error: 'Unauthorized' }

  const dept = await prisma.department.update({
    where: { id: deptId },
    data: {
      ...(data.name && { name: data.name }),
      headId: data.headId !== undefined ? data.headId : undefined,
      parentId: data.parentId !== undefined ? data.parentId : undefined,
      ...(data.status && { status: data.status }),
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'dept.update',
      entityType: 'Department',
      entityId: dept.id,
      metadata: { name: dept.name, changes: Object.keys(data) },
    },
  })

  revalidatePath('/org-setup')
  return { success: true, dept }
}

// Categories
export async function createCategory(data: { name: string; customFields?: Record<string, string> }) {
  const user = await getUser()
  if (!can('category.manage', user)) return { error: 'Unauthorized' }

  const parsed = categorySchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const category = await prisma.assetCategory.create({
    data: {
      name: parsed.data.name,
      customFields: parsed.data.customFields
        ? (parsed.data.customFields as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'category.create',
      entityType: 'AssetCategory',
      entityId: category.id,
      metadata: { name: category.name },
    },
  })

  revalidatePath('/org-setup')
  return { success: true, category }
}

export async function updateCategory(
  categoryId: string,
  data: { name?: string; customFields?: Record<string, string> | null }
) {
  const user = await getUser()
  if (!can('category.manage', user)) return { error: 'Unauthorized' }

  const updateData: any = {}
  if (data.name) updateData.name = data.name
  if (data.customFields !== undefined) {
    updateData.customFields = data.customFields
      ? (data.customFields as Prisma.InputJsonValue)
      : Prisma.JsonNull
  }

  const category = await prisma.assetCategory.update({
    where: { id: categoryId },
    data: updateData,
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'category.update',
      entityType: 'AssetCategory',
      entityId: category.id,
      metadata: { name: category.name, changes: Object.keys(data) },
    },
  })

  revalidatePath('/org-setup')
  return { success: true, category }
}

// User role promotion — ADMIN ONLY, server-enforced
export async function promoteUser(data: {
  userId: string
  role: 'EMPLOYEE' | 'DEPARTMENT_HEAD' | 'ASSET_MANAGER' | 'ADMIN'
  departmentId?: string
}) {
  const user = await getUser()
  // CRITICAL: Only ADMIN can promote — checked server-side
  if (!can('user.promote', user)) return { error: 'Only Admins can assign roles.' }

  const parsed = promoteUserSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const updatedUser = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      role: parsed.data.role,
      ...(parsed.data.departmentId && { departmentId: parsed.data.departmentId }),
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'user.promote',
      entityType: 'User',
      entityId: parsed.data.userId,
      metadata: { newRole: parsed.data.role },
    },
  })

  revalidatePath('/org-setup')
  return { success: true, user: updatedUser }
}

export async function updateUserStatus(userId: string, status: 'ACTIVE' | 'INACTIVE') {
  const user = await getUser()
  if (!can('user.promote', user)) return { error: 'Unauthorized' }

  const updated = await prisma.user.update({ where: { id: userId }, data: { status } })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'user.status',
      entityType: 'User',
      entityId: userId,
      metadata: { name: updated.name, status },
    },
  })

  revalidatePath('/org-setup')
  return { success: true }
}

// Getters
export async function getDepartments() {
  return prisma.department.findMany({
    include: { head: true, parent: true, children: true },
    orderBy: { name: 'asc' },
  })
}

export async function getCategories() {
  return prisma.assetCategory.findMany({ orderBy: { name: 'asc' } })
}

export async function getUsers() {
  return prisma.user.findMany({
    include: { department: true },
    orderBy: { name: 'asc' },
  })
}
