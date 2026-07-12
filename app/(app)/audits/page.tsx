import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAuditCycles } from '@/lib/actions/audits'
import { getDepartments, getUsers } from '@/lib/actions/org'
import { AuditsClient } from './AuditsClient'

export const dynamic = 'force-dynamic'

export default async function AuditsPage() {
  const session = await getServerSession(authOptions)
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
