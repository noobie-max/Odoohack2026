import { getDashboardKPIs } from '@/lib/actions/dashboard'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import {
  Package, CheckCircle, Wrench, Calendar, ArrowLeftRight,
  AlertTriangle, Plus, BookOpen, Clock
} from 'lucide-react'
import { timeAgo, friendlyActionLabel, assetStatusColors } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const kpis = await getDashboardKPIs()

  const kpiCards = [
    { label: 'Available Assets', value: kpis.availableCount, icon: CheckCircle, color: '#22c55e', bg: '#f0fdf4' },
    { label: 'Allocated Assets', value: kpis.allocatedCount, icon: Package, color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Active Bookings', value: kpis.activeBookings, icon: Calendar, color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'Pending Transfers', value: kpis.pendingTransfers, icon: ArrowLeftRight, color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Under Maintenance', value: kpis.underMaintenanceCount, icon: Wrench, color: '#f97316', bg: '#fff7ed' },
    { label: 'Pending Requests', value: kpis.pendingMaintenance, icon: BookOpen, color: '#64748b', bg: '#f8fafc' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div className="section-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Good morning, {session?.user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Here's your asset management overview for today.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/assets?action=register" className="btn btn-primary">
            <Plus size={16} /> Register Asset
          </Link>
          <Link href="/bookings?action=new" className="btn btn-secondary">
            <Calendar size={16} /> Book Resource
          </Link>
          <Link href="/maintenance?action=raise" className="btn btn-secondary">
            <Wrench size={16} /> Raise Request
          </Link>
        </div>
      </div>

      {/* Overdue Banner */}
      {kpis.overdueCount > 0 && (
        <div className="alert-banner">
          <AlertTriangle size={18} />
          <span>
            <strong>{kpis.overdueCount} asset{kpis.overdueCount !== 1 ? 's' : ''}</strong> overdue for return — flagged for follow-up.
          </span>
          <Link href="/allocations?filter=overdue" style={{ marginLeft: 'auto', color: '#991b1b', fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none' }}>
            View overdue →
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid-kpi">
        {kpiCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} style={{ color }} />
              </div>
            </div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Recent Activity */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: '0.75rem' }}>
            <div className="section-title">Recent Activity</div>
            <Link href="/notifications" style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none' }}>View all</Link>
          </div>
          {kpis.recentActivity.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>No recent activity</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {kpis.recentActivity.map((log: any) => (
                <div key={log.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: '#eff6ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Package size={12} style={{ color: '#2563eb' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', color: '#0f172a', lineHeight: 1.4 }}>
                      <strong>{log.userName}</strong> — {friendlyActionLabel(log.action, log.metadata)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.125rem' }}>
                      {timeAgo(log.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Returns */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: '0.75rem' }}>
            <div className="section-title">Upcoming Returns (7 days)</div>
            <Link href="/allocations" style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none' }}>Manage</Link>
          </div>
          {kpis.upcomingReturns.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>No upcoming returns</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {kpis.upcomingReturns.map((alloc: any) => (
                <div key={alloc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
                  <Clock size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }} className="truncate">
                      {alloc.asset.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {alloc.employee.name} — Due {formatDate(alloc.expectedReturnDate)}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '0.125rem 0.5rem', borderRadius: '9999px', flexShrink: 0 }}>
                    {alloc.asset.tag}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
