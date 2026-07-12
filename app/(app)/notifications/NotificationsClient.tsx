'use client'

import { useState, useTransition } from 'react'
import { markNotificationRead, markAllRead } from '@/lib/actions/notifications'
import { Bell, CheckCheck, Activity } from 'lucide-react'
import { timeAgo, friendlyActionLabel } from '@/lib/utils'

type Bucket = 'ALL' | 'ALERTS' | 'APPROVALS' | 'BOOKINGS'

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ALERTS', label: 'Alerts' },
  { key: 'APPROVALS', label: 'Approvals' },
  { key: 'BOOKINGS', label: 'Bookings' },
]

const BUCKET_TYPES: Record<string, string[]> = {
  ALERTS: ['OVERDUE_RETURN', 'AUDIT_DISCREPANCY_FLAGGED', 'ASSET_ASSIGNED'],
  APPROVALS: ['TRANSFER_REQUESTED', 'TRANSFER_APPROVED', 'TRANSFER_REJECTED', 'MAINTENANCE_APPROVED', 'MAINTENANCE_REJECTED', 'MAINTENANCE_RESOLVED'],
  BOOKINGS: ['BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER'],
}

const typeIcons: Record<string, { emoji: string; color: string }> = {
  ASSET_ASSIGNED: { emoji: '📦', color: '#3b82f6' },
  TRANSFER_REQUESTED: { emoji: '🔄', color: '#f59e0b' },
  TRANSFER_APPROVED: { emoji: '✅', color: '#22c55e' },
  TRANSFER_REJECTED: { emoji: '❌', color: '#ef4444' },
  BOOKING_CONFIRMED: { emoji: '📅', color: '#8b5cf6' },
  BOOKING_CANCELLED: { emoji: '🚫', color: '#ef4444' },
  BOOKING_REMINDER: { emoji: '⏰', color: '#f59e0b' },
  MAINTENANCE_APPROVED: { emoji: '🔧', color: '#f97316' },
  MAINTENANCE_REJECTED: { emoji: '🚫', color: '#ef4444' },
  MAINTENANCE_RESOLVED: { emoji: '✅', color: '#22c55e' },
  OVERDUE_RETURN: { emoji: '⚠️', color: '#ef4444' },
  AUDIT_DISCREPANCY_FLAGGED: { emoji: '🔍', color: '#dc2626' },
}

export function NotificationsClient({ notifications, activityLogs }: any) {
  const [activeBucket, setActiveBucket] = useState<Bucket>('ALL')
  const [showLogs, setShowLogs] = useState(false)
  const [isPending, startTransition] = useTransition()

  const filtered = activeBucket === 'ALL'
    ? notifications
    : notifications.filter((n: any) => BUCKET_TYPES[activeBucket]?.includes(n.type))

  const unreadCount = notifications.filter((n: any) => !n.isRead).length

  function handleMarkRead(id: string) {
    startTransition(async () => { await markNotificationRead(id) })
  }

  function handleMarkAllRead() {
    startTransition(async () => { await markAllRead() })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Notifications</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {unreadCount > 0 && (
            <button className="btn btn-secondary" onClick={handleMarkAllRead} disabled={isPending}>
              <CheckCheck size={16} /> Mark all read
            </button>
          )}
          <button
            className={`btn ${showLogs ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowLogs(!showLogs)}
          >
            <Activity size={16} /> Activity Log
          </button>
        </div>
      </div>

      {!showLogs ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="tabs-list">
            {BUCKETS.map(({ key, label }) => {
              const count = key === 'ALL' ? notifications.length : notifications.filter((n: any) => BUCKET_TYPES[key]?.includes(n.type)).length
              return (
                <button key={key} className={`tab-trigger ${activeBucket === key ? 'active' : ''}`} onClick={() => setActiveBucket(key)}>
                  {label} {count > 0 && <span style={{ marginLeft: '0.25rem', background: activeBucket === key ? 'rgba(255,255,255,0.3)' : '#e2e8f0', borderRadius: '9999px', padding: '0 0.375rem', fontSize: '0.7rem' }}>{count}</span>}
                </button>
              )
            })}
          </div>

          <div style={{ padding: '0.5rem 0' }}>
            {filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <Bell size={32} />
                <div style={{ marginTop: '0.5rem' }}>No notifications</div>
              </div>
            ) : filtered.map((n: any) => {
              const icon = typeIcons[n.type] || { emoji: '📌', color: '#64748b' }
              return (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.875rem',
                    padding: '0.875rem 1.25rem',
                    borderBottom: '1px solid #f1f5f9',
                    background: n.isRead ? 'transparent' : '#fafbff',
                    cursor: n.isRead ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `${icon.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: '1rem',
                  }}>
                    {icon.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: n.isRead ? 400 : 500, lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                  {!n.isRead && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} style={{ color: '#2563eb' }} />
            <span style={{ fontWeight: 600 }}>Activity Log</span>
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>({activityLogs.length} entries)</span>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th></tr>
            </thead>
            <tbody>
              {activityLogs.length === 0 ? (
                <tr><td colSpan={4}><div className="empty-state">No activity yet</div></td></tr>
              ) : activityLogs.map((log: any) => (
                <tr key={log.id}>
                  <td style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{timeAgo(log.createdAt)}</td>
                  <td style={{ fontWeight: 500 }}>{log.user?.name}</td>
                  <td style={{ fontSize: '0.8rem' }}>{friendlyActionLabel(log.action, log.metadata)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
                    {log.entityType}
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
