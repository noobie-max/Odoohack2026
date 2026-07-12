import { getDashboardKPIs } from '@/lib/actions/dashboard'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import {
  Package, CheckCircle2, Wrench, Calendar, ArrowLeftRight,
  AlertTriangle, Plus, Clock, Activity, ClipboardList, ChevronRight
} from 'lucide-react'
import { timeAgo, friendlyActionLabel, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const kpis = await getDashboardKPIs()
  const role = session?.user?.role as string

  const canRegister = role === 'ADMIN' || role === 'ASSET_MANAGER'

  const kpiCards = [
    { label: 'Assets Available', value: kpis.availableCount, icon: CheckCircle2, color: '#059669', bg: '#ecfdf5' },
    { label: 'Assets Allocated', value: kpis.allocatedCount, icon: Package, color: '#4f46e5', bg: '#eef2ff' },
    { label: 'Active Bookings', value: kpis.activeBookings, icon: Calendar, color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Pending Transfers', value: kpis.pendingTransfers, icon: ArrowLeftRight, color: '#d97706', bg: '#fffbeb' },
    { label: 'In Maintenance', value: kpis.underMaintenanceCount, icon: Wrench, color: '#ea580c', bg: '#fff7ed' },
    { label: 'Upcoming Returns', value: kpis.upcomingReturns.length, icon: Clock, color: '#0284c7', bg: '#f0f9ff' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      {/* Page Header */}
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">
            {greeting()}, {session?.user?.name?.split(' ')[0]}
          </h1>
          <p className="page-subtitle">
            Here&apos;s your operational snapshot for today.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          {canRegister && (
            <Link href="/assets?action=register" className="btn btn-primary">
              <Plus size={16} /> Register Asset
            </Link>
          )}
          <Link href="/bookings?action=new" className="btn btn-secondary">
            <Calendar size={15} /> Book Resource
          </Link>
          <Link href="/maintenance?action=raise" className="btn btn-secondary">
            <Wrench size={15} /> Raise Request
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
          <Link href="/allocations?filter=overdue" style={{ marginLeft: 'auto', color: '#9f1239', fontWeight: 650, fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
            View overdue <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid-kpi">
        {kpiCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="kpi-card" style={{ ['--kpi-accent' as string]: color }}>
            <div className="icon-chip" style={{ background: bg, marginBottom: '0.45rem' }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.4rem' }}>
        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={16} style={{ color: 'var(--brand-600)' }} /> Recent Activity
            </div>
            <Link href="/notifications" style={{ fontSize: '0.8rem', color: 'var(--brand-600)', textDecoration: 'none', fontWeight: 600 }}>View all</Link>
          </div>
          {kpis.recentActivity.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <ClipboardList size={28} />
              No recent activity
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {kpis.recentActivity.map((log: any, i: number) => (
                <div key={log.id} style={{
                  display: 'flex', gap: '0.8rem', alignItems: 'flex-start',
                  padding: '0.65rem 0',
                  borderBottom: i < kpis.recentActivity.length - 1 ? '1px solid #f1f3f9' : 'none',
                }}>
                  <div className="icon-chip" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--brand-50)' }}>
                    <Package size={13} style={{ color: 'var(--brand-600)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-1)', lineHeight: 1.45 }}>
                      <strong>{log.userName}</strong> — {friendlyActionLabel(log.action, log.metadata)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.15rem' }}>
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
          <div className="card-header">
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} style={{ color: 'var(--warn)' }} /> Upcoming Returns
              <span className="badge no-dot" style={{ background: 'var(--warn-bg)', color: '#92400e', borderColor: 'var(--warn-border)' }}>next 7 days</span>
            </div>
            <Link href="/allocations" style={{ fontSize: '0.8rem', color: 'var(--brand-600)', textDecoration: 'none', fontWeight: 600 }}>Manage</Link>
          </div>
          {kpis.upcomingReturns.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <Clock size={28} />
              No returns due this week
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {kpis.upcomingReturns.map((alloc: any) => (
                <div key={alloc.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 0.8rem', background: '#fafbfe',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-1)' }} className="truncate">
                      {alloc.asset.name}
                    </div>
                    <div style={{ fontSize: '0.71rem', color: 'var(--text-2)', marginTop: 1 }}>
                      {alloc.employee.name} · due {formatDate(alloc.expectedReturnDate)}
                    </div>
                  </div>
                  <span className="badge no-dot" style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', borderColor: 'var(--brand-200)', fontVariantNumeric: 'tabular-nums' }}>
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
