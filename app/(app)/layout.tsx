import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div>
      <Sidebar role={session.user.role as string} />
      <div className="main-content">
        <Topbar user={session.user} />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  )
}
