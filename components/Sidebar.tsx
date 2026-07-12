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
  Boxes,
} from 'lucide-react'

const navSections = [
  {
    title: 'Overview',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN'] },
      { href: '/notifications', icon: Bell, label: 'Notifications', roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN'] },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/assets', icon: Package, label: 'Assets', roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN'] },
      { href: '/allocations', icon: ArrowLeftRight, label: 'Allocation & Transfer', roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN'] },
      { href: '/bookings', icon: Calendar, label: 'Resource Booking', roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN'] },
      { href: '/maintenance', icon: Wrench, label: 'Maintenance', roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN'] },
    ],
  },
  {
    title: 'Governance',
    items: [
      { href: '/audits', icon: ClipboardCheck, label: 'Audit Cycles', roles: ['ASSET_MANAGER', 'ADMIN', 'DEPARTMENT_HEAD'] },
      { href: '/reports', icon: BarChart3, label: 'Reports & Analytics', roles: ['ASSET_MANAGER', 'ADMIN', 'DEPARTMENT_HEAD'] },
      { href: '/org-setup', icon: Building2, label: 'Organization Setup', roles: ['ADMIN'] },
    ],
  },
]

export function Sidebar({ role, userName }: { role: string; userName?: string }) {
  const pathname = usePathname()

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <Boxes size={18} />
        </div>
        <div className="logo-text">
          Asset<span>Flow</span>
        </div>
      </div>

      <div className="sidebar-nav">
        {navSections.map(section => {
          const visible = section.items.filter(item => item.roles.includes(role))
          if (visible.length === 0) return null
          return (
            <div className="sidebar-section" key={section.title}>
              <div className="sidebar-section-title">{section.title}</div>
              {visible.map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`sidebar-item ${pathname.startsWith(href) ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span className="label">{label}</span>
                </Link>
              ))}
            </div>
          )
        })}
      </div>

      <div className="sidebar-footer">
        <span className="role-chip">{role.replace(/_/g, ' ')}</span>
      </div>
    </nav>
  )
}
