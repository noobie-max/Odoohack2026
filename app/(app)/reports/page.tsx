import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getReportsData } from '@/lib/actions/reports'
import { ReportsClient } from './ReportsClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'ASSET_MANAGER' && role !== 'DEPARTMENT_HEAD') {
    redirect('/dashboard')
  }

  const data = await getReportsData()

  return <ReportsClient data={data} />
}
