import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getNotifications, getActivityLogs } from '@/lib/actions/notifications'
import { NotificationsClient } from './NotificationsClient'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  const canViewLogs = role === 'ADMIN' || role === 'ASSET_MANAGER'

  const [notifications, activityLogs] = await Promise.all([
    getNotifications('ALL'),
    canViewLogs ? getActivityLogs(30) : Promise.resolve([]),
  ])

  return (
    <NotificationsClient
      notifications={notifications as any}
      activityLogs={activityLogs as any}
      canViewLogs={canViewLogs}
    />
  )
}
