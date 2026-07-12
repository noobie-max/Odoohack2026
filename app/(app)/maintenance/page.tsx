import { getMaintenanceRequests } from '@/lib/actions/maintenance'
import { getAssets } from '@/lib/actions/assets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MaintenanceClient } from './MaintenanceClient'

export const dynamic = 'force-dynamic'

export default async function MaintenancePage() {
  const session = await getServerSession(authOptions)
  const [requests, assets] = await Promise.all([
    getMaintenanceRequests(),
    getAssets(),
  ])

  return (
    <MaintenanceClient
      requests={requests as any}
      assets={assets as any}
      userRole={session?.user?.role as string}
      userId={session?.user?.id as string}
    />
  )
}
