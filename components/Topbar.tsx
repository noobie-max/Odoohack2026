'use client'

import { useSession, signOut } from 'next-auth/react'
import { Bell, LogOut, User } from 'lucide-react'
import Link from 'next/link'

export function Topbar({ user }: { user: any }) {
  return (
    <div className="topbar">
      <div className="topbar-title"></div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href="/notifications" style={{ color: '#64748b', display: 'flex', alignItems: 'center', padding: '0.375rem' }}>
          <Bell size={18} />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#2563eb',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', lineHeight: 1 }}>{user?.name}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{user?.role?.replace(/_/g, ' ')}</div>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="btn btn-ghost btn-sm"
          style={{ gap: '0.25rem' }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  )
}
