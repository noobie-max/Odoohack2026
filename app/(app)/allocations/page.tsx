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
    getAssets({}),
    getUsers(),
  ])

  // Allocation picker lists available AND allocated assets — picking an
  // allocated one triggers the double-allocation block + transfer flow.
  const allocatableAssets = (assets as any[]).filter(
    a => !a.isBookable && (a.status === 'AVAILABLE' || a.status === 'ALLOCATED')
  )

  return (
    <AllocationsClient
      allocations={allocations as any}
      pendingTransfers={transfers as any}
      availableAssets={allocatableAssets as any}
      users={users as any}
      userRole={session?.user?.role as string}
      userId={session?.user?.id as string}
    />
  )
}
