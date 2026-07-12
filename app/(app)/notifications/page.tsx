import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getNotifications, getActivityLogs } from '@/lib/actions/notifications'
import { NotificationsClient } from './NotificationsClient'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const [notifications, activityLogs] = await Promise.all([
    getNotifications('ALL'),
    getActivityLogs(30),
  ])

  return (
    <NotificationsClient
      notifications={notifications as any}
      activityLogs={activityLogs as any}
    />
  )
}
