'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Package,
  ArrowLeftRight,
  Calendar,
  Wrench,
  ClipboardCheck,
  BarChart3,
  Bell,
  Settings,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN'] },
  { href: '/org-setup', icon: Building2, label: 'Organization Setup', roles: ['ADMIN'] },
  { href: '/assets', icon: Package, label: 'Assets', roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN'] },
  { href: '/allocations', icon: ArrowLeftRight, label: 'Allocation & Transfer', roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN'] },
  { href: '/bookings', icon: Calendar, label: 'Resource Booking', roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN'] },
  { href: '/maintenance', icon: Wrench, label: 'Maintenance', roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN'] },
  { href: '/audits', icon: ClipboardCheck, label: 'Audit', roles: ['ASSET_MANAGER', 'ADMIN', 'DEPARTMENT_HEAD'] },
  { href: '/reports', icon: BarChart3, label: 'Reports', roles: ['ASSET_MANAGER', 'ADMIN', 'DEPARTMENT_HEAD'] },
  { href: '/notifications', icon: Bell, label: 'Notifications', roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN'] },
]

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname()

  const visibleItems = navItems.filter(item => item.roles.includes(role))

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <Package size={20} style={{ color: '#3b82f6' }} />
        Asset<span>Flow</span>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section">
          {visibleItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`sidebar-item ${pathname.startsWith(href) ? 'active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ padding: '0.75rem', borderTop: '1px solid #1e293b' }}>
        <div style={{ fontSize: '0.7rem', color: '#475569', padding: '0.25rem 0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {role.replace('_', ' ')}
        </div>
      </div>
    </nav>
  )
}
