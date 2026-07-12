import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAuditCycles } from '@/lib/actions/audits'
import { getDepartments, getUsers } from '@/lib/actions/org'
import { AuditsClient } from './AuditsClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AuditsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'ASSET_MANAGER' && role !== 'DEPARTMENT_HEAD') {
    const assignedCycles = await prisma.auditCycle.count({
      where: { auditors: { some: { id: session.user.id } } },
    })
    if (assignedCycles === 0) redirect('/dashboard')
  }

  const [cycles, departments, users] = await Promise.all([
    getAuditCycles(),
    getDepartments(),
    getUsers(),
  ])

  return (
    <AuditsClient
      cycles={cycles as any}
      departments={departments as any}
      users={users as any}
      userRole={session?.user?.role as string}
    />
  )
}
