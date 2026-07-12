import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveAllocations, getPendingTransfers } from '@/lib/actions/allocations'
import { getAssets } from '@/lib/actions/assets'
import { getUsers } from '@/lib/actions/org'
import { AllocationsClient } from './AllocationsClient'

export const dynamic = 'force-dynamic'

export default async function AllocationsPage() {
  const session = await getServerSession(authOptions)
  const [allocations, transfers, assets, users] = await Promise.all([
    getActiveAllocations(),
    getPendingTransfers(),
    getAssets({ status: 'AVAILABLE' }),
    getUsers(),
  ])

  return (
    <AllocationsClient
      allocations={allocations as any}
      pendingTransfers={transfers as any}
      availableAssets={assets as any}
      users={users as any}
      userRole={session?.user?.role as string}
      userId={session?.user?.id as string}
    />
  )
}
