'use client'

import { useState, useTransition } from 'react'
import { markNotificationRead, markAllRead } from '@/lib/actions/notifications'
import {
  Bell, CheckCheck, Calendar, Wrench, ArrowLeftRight,
  AlertTriangle, Package, ClipboardList,
} from 'lucide-react'
import { timeAgo, friendlyActionLabel, formatDateTime } from '@/lib/utils'

type Bucket = 'ALL' | 'ALERTS' | 'APPROVALS' | 'BOOKINGS'
type Tab = Bucket | 'LOGS'

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ALERTS', label: 'Alerts' },
  { key: 'APPROVALS', label: 'Approvals' },
  { key: 'BOOKINGS', label: 'Bookings' },
]

const BUCKET_TYPES: Record<string, string[]> = {
  ALERTS: ['OVERDUE_RETURN', 'AUDIT_DISCREPANCY_FLAGGED', 'ASSET_ASSIGNED'],
  APPROVALS: ['TRANSFER_REQUESTED', 'TRANSFER_APPROVED', 'TRANSFER_REJECTED', 'MAINTENANCE_REQUESTED', 'MAINTENANCE_APPROVED', 'MAINTENANCE_REJECTED', 'MAINTENANCE_RESOLVED'],
  BOOKINGS: ['BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER'],
}

function typeVisual(type: string) {
  if (type.startsWith('BOOKING_')) return { Icon: Calendar, bg: '#f0f9ff', color: '#0284c7' }
  if (type.startsWith('MAINTENANCE_')) return { Icon: Wrench, bg: '#fff7ed', color: '#ea580c' }
  if (type.startsWith('TRANSFER_')) return { Icon: ArrowLeftRight, bg: '#fffbeb', color: '#d97706' }
  if (type === 'OVERDUE_RETURN' || type === 'AUDIT_DISCREPANCY_FLAGGED') return { Icon: AlertTriangle, bg: '#fff1f2', color: '#e11d48' }
  if (type === 'ASSET_ASSIGNED') return { Icon: Package, bg: '#eef2ff', color: '#4f46e5' }
  return { Icon: Bell, bg: '#eef2ff', color: '#4f46e5' }
}

export function NotificationsClient({ notifications, activityLogs, canViewLogs }: any) {
  const [activeTab, setActiveTab] = useState<Tab>('ALL')
  const [isPending, startTransition] = useTransition()

  const filtered = activeTab === 'ALL' || activeTab === 'LOGS'
    ? notifications
    : notifications.filter((n: any) => BUCKET_TYPES[activeTab]?.includes(n.type))

  const unreadCount = notifications.filter((n: any) => !n.isRead).length

  function unreadFor(key: Bucket) {
    if (key === 'ALL') return unreadCount
    return notifications.filter((n: any) => !n.isRead && BUCKET_TYPES[key]?.includes(n.type)).length
  }

  function handleMarkRead(id: string) {
    startTransition(async () => { await markNotificationRead(id) })
  }

  function handleMarkAllRead() {
    startTransition(async () => { await markAllRead() })
  }

  const showLogs = activeTab === 'LOGS' && canViewLogs

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Notifications &amp; Activity</h1>
          <p className="page-subtitle">Everything that needs your attention, in one stream.</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={handleMarkAllRead} disabled={isPending}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="tabs-list" style={{ marginBottom: 0, alignSelf: 'flex-start' }}>
        {BUCKETS.map(({ key, label }) => {
          const unread = unreadFor(key)
          return (
            <button
              key={key}
              className={`tab-trigger ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
              {unread > 0 && (
                <span style={{
                  marginLeft: '0.4rem',
                  background: 'var(--brand-100)',
                  color: 'var(--brand-700)',
                  borderRadius: 999,
                  padding: '0.05rem 0.42rem',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {unread}
                </span>
              )}
            </button>
          )
        })}
        {canViewLogs && (
          <button
            className={`tab-trigger ${activeTab === 'LOGS' ? 'active' : ''}`}
            onClick={() => setActiveTab('LOGS')}
          >
            Activity Log
          </button>
        )}
      </div>

      {!showLogs ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <Bell size={28} />
              You&apos;re all caught up — nothing here right now.
            </div>
          ) : filtered.map((n: any, i: number) => {
            const { Icon, bg, color } = typeVisual(n.type)
            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && handleMarkRead(n.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  padding: '0.85rem 1.2rem',
                  borderBottom: i < filtered.length - 1 ? '1px solid #f1f3f9' : 'none',
                  background: n.isRead ? 'transparent' : '#f6f7ff',
                  cursor: n.isRead ? 'default' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <div className="icon-chip" style={{ background: bg, width: 34, height: 34, borderRadius: 9 }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.865rem', color: 'var(--text-1)', fontWeight: n.isRead ? 400 : 600, lineHeight: 1.45 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
                {!n.isRead && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--brand-500)',
                    flexShrink: 0, marginTop: 7,
                  }} />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th></tr>
            </thead>
            <tbody>
              {activityLogs.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <ClipboardList size={28} />
                      No activity recorded yet.
                    </div>
                  </td>
                </tr>
              ) : activityLogs.map((log: any) => (
                <tr key={log.id}>
                  <td
                    title={formatDateTime(log.createdAt)}
                    style={{ color: 'var(--text-2)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                  >
                    {timeAgo(log.createdAt)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <div className="avatar" style={{ width: 26, height: 26, fontSize: '0.62rem', boxShadow: 'none' }}>
                        {(log.user?.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{log.user?.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{friendlyActionLabel(log.action, log.metadata)}</td>
                  <td>
                    <span className="badge no-dot" style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', borderColor: 'var(--brand-200)' }}>
                      {log.entityType}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
