import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'
import { getUnreadCount } from '@/lib/actions/notifications'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const unreadCount = await getUnreadCount().catch(() => 0)

  return (
    <div>
      <Sidebar role={session.user.role as string} userName={session.user.name ?? undefined} />
      <div className="main-content">
        <Topbar user={session.user} unreadCount={unreadCount} />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  )
}
