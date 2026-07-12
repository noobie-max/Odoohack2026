'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import { Download, Package, Calendar, Wrench, TrendingUp } from 'lucide-react'

export function ReportsClient({ utilizationData, mostBookedAssets, idleAssets, needsMaintenance, summaryStats }: any) {
  function downloadCSV(data: any[], filename: string) {
    if (!data.length) return
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(row => Object.values(row).join(','))
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const summaryCards = [
    { label: 'Total Assets', value: summaryStats.totalAssets, icon: Package, color: '#2563eb' },
    { label: 'Allocated', value: summaryStats.totalAllocated, icon: TrendingUp, color: '#22c55e' },
    { label: 'Total Bookings', value: summaryStats.totalBookings, icon: Calendar, color: '#8b5cf6' },
    { label: 'Maintenance Requests', value: summaryStats.totalMaintenance, icon: Wrench, color: '#f59e0b' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Reports & Analytics</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>Operational insights and asset utilization metrics</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => downloadCSV(utilizationData, 'assetflow-utilization.csv')}
        >
          <Download size={16} /> Export Report
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid-kpi">
        {summaryCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="kpi-card">
            <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Utilization by Department */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: '1rem' }}>Asset Utilization by Department</div>
          {utilizationData.length === 0 ? (
            <div className="empty-state">No department data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={utilizationData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="allocated" name="Allocated" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="available" name="Available" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="maintenance" name="Maintenance" fill="#f97316" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Most Booked Resources */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: '1rem' }}>Most Used Resources</div>
          {mostBookedAssets.length === 0 ? (
            <div className="empty-state">No bookable resources</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {mostBookedAssets.map((a: any, i: number) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#0f172a' }} className="truncate">{a.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{a.category?.name}</div>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2563eb' }}>{a._count.bookings} bookings</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Idle Assets */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: '0.75rem' }}>Idle Assets (30+ days unused)</div>
          {idleAssets.length === 0 ? (
            <div className="empty-state" style={{ padding: '1rem' }}>No idle assets — great utilization!</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Tag</th><th>Name</th><th>Category</th></tr></thead>
              <tbody>
                {idleAssets.map((a: any) => (
                  <tr key={a.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{a.tag}</td>
                    <td>{a.name}</td>
                    <td style={{ color: '#64748b' }}>{a.category?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Needs Maintenance */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: '0.75rem', color: '#f97316' }}>Assets Needing Attention</div>
          {needsMaintenance.length === 0 ? (
            <div className="empty-state" style={{ padding: '1rem' }}>All assets in good condition</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Tag</th><th>Name</th><th>Condition</th></tr></thead>
              <tbody>
                {needsMaintenance.map((a: any) => (
                  <tr key={a.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{a.tag}</td>
                    <td>{a.name}</td>
                    <td>
                      <span className="badge" style={{ background: a.status === 'UNDER_MAINTENANCE' ? '#fff7ed' : '#fef2f2', color: a.status === 'UNDER_MAINTENANCE' ? '#c2410c' : '#991b1b' }}>
                        {a.status === 'UNDER_MAINTENANCE' ? 'Under Maintenance' : a.condition}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
