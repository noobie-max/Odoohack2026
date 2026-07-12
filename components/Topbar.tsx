'use client'

import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Bell, LogOut } from 'lucide-react'
import Link from 'next/link'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/org-setup': 'Organization Setup',
  '/assets': 'Asset Directory',
  '/allocations': 'Allocation & Transfer',
  '/bookings': 'Resource Booking',
  '/maintenance': 'Maintenance Management',
  '/audits': 'Audit Cycles',
  '/reports': 'Reports & Analytics',
  '/notifications': 'Notifications & Activity',
}

export function Topbar({ user, unreadCount = 0 }: { user: any; unreadCount?: number }) {
  const pathname = usePathname()
  const title = Object.entries(pageTitles).find(([path]) => pathname.startsWith(path))?.[1] ?? 'AssetFlow'

  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        <Link href="/notifications" className="topbar-bell" aria-label="Notifications">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="unread-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className="avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-1)', lineHeight: 1.2 }}>{user?.name}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-2)', fontWeight: 500 }}>{user?.role?.replace(/_/g, ' ')}</div>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="btn btn-ghost btn-sm"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  )
}
