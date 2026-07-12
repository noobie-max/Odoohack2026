'use client'

import { Fragment } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import {
  Download, Package, Calendar, CalendarRange, Wrench, TrendingUp,
  BarChart3, Activity, CheckCircle2, Layers,
} from 'lucide-react'
import type { getReportsData } from '@/lib/actions/reports'

type ReportsData = Awaited<ReturnType<typeof getReportsData>>

const AXIS_TICK = { fontSize: 11, fill: '#94a3b8' }

const TOOLTIP_PROPS = {
  contentStyle: {
    background: '#fff',
    border: '1px solid #e5e8f0',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
    fontSize: 12,
  },
  labelStyle: { color: '#0f172a', fontWeight: 600 },
  itemStyle: { color: '#475569' },
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: 'Available', color: '#059669' },
  ALLOCATED: { label: 'Allocated', color: '#4f46e5' },
  RESERVED: { label: 'Reserved', color: '#d97706' },
  UNDER_MAINTENANCE: { label: 'Under maintenance', color: '#ea580c' },
  LOST: { label: 'Lost', color: '#e11d48' },
  RETIRED: { label: 'Retired', color: '#64748b' },
  DISPOSED: { label: 'Disposed', color: '#94a3b8' },
}

const HEAT_RAMP = ['#f1f5f9', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca']
const HEAT_LEGEND = [HEAT_RAMP[0], HEAT_RAMP[2], HEAT_RAMP[4], HEAT_RAMP[6], HEAT_RAMP[7]]
const HEAT_HOURS = Array.from({ length: 13 }, (_, i) => i + 8)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function hourLabel(h: number) {
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

function csvEscape(value: unknown) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function csvSection(title: string, header: string[], rows: unknown[][]) {
  return [title, header.join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n')
}

function CardHeader({ title, caption }: { title: string; caption?: string }) {
  return (
    <div className="card-header">
      <div>
        <div className="section-title">{title}</div>
        {caption && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>{caption}</div>
        )}
      </div>
    </div>
  )
}

export function ReportsClient({ data }: { data: ReportsData }) {
  const {
    utilizationData, mostBookedAssets, idleAssets, needsAttention,
    allocationTrends, maintenanceByCategory, bookingHeatmap,
    statusBreakdown, summaryStats,
  } = data

  const utilizationPct = summaryStats.totalAssets
    ? Math.round((summaryStats.totalAllocated / summaryStats.totalAssets) * 100)
    : 0
  const bookingsLast30 = bookingHeatmap.reduce((sum, cell) => sum + cell.count, 0)

  const kpis = [
    { label: 'Total Assets', value: summaryStats.totalAssets, icon: Package, color: '#4f46e5', bg: '#eef2ff' },
    { label: 'Utilization', value: `${utilizationPct}%`, icon: TrendingUp, color: '#059669', bg: '#ecfdf5' },
    { label: 'Maintenance Requests', value: summaryStats.totalMaintenance, icon: Wrench, color: '#ea580c', bg: '#fff7ed' },
    { label: 'Bookings (30 days)', value: bookingsLast30, icon: Calendar, color: '#7c3aed', bg: '#f5f3ff' },
  ]

  const deptUtilization = utilizationData.map((d) => ({
    ...d,
    utilization: d.total ? Math.round((d.allocated / d.total) * 100) : 0,
  }))

  const hasTrend = allocationTrends.some((t) => t.count > 0)
  const maintenanceSorted = [...maintenanceByCategory].sort((a, b) => b.count - a.count)

  const statusCounts = new Map<string, number>(statusBreakdown.map((s) => [String(s.status), s.count]))
  const statusRows = [
    ...Object.keys(STATUS_META).map((status) => ({ status, count: statusCounts.get(status) ?? 0 })),
    ...statusBreakdown
      .filter((s) => !(String(s.status) in STATUS_META))
      .map((s) => ({ status: String(s.status), count: s.count })),
  ]
  const maxStatusCount = Math.max(1, ...statusRows.map((r) => r.count))

  const heatCounts = new Map<string, number>(bookingHeatmap.map((c) => [`${c.day}-${c.hour}`, c.count]))
  const maxHeat = Math.max(
    1,
    ...DAY_ORDER.flatMap((d) => HEAT_HOURS.map((h) => heatCounts.get(`${d}-${h}`) ?? 0)),
  )
  const heatColor = (count: number) => {
    if (count === 0) return HEAT_RAMP[0]
    return HEAT_RAMP[Math.max(1, Math.min(7, Math.round((count / maxHeat) * 7)))]
  }

  function handleExport() {
    const csv = [
      csvSection(
        'Utilization by department',
        ['Department', 'Total', 'Allocated', 'Available', 'Under maintenance'],
        utilizationData.map((d) => [d.name, d.total, d.allocated, d.available, d.maintenance]),
      ),
      csvSection(
        'Asset status breakdown',
        ['Status', 'Count'],
        statusBreakdown.map((s) => [STATUS_META[String(s.status)]?.label ?? s.status, s.count]),
      ),
      csvSection(
        'Maintenance by category',
        ['Category', 'Requests'],
        maintenanceByCategory.map((m) => [m.category, m.count]),
      ),
      csvSection(
        'Allocation trend (6 months)',
        ['Month', 'Allocations'],
        allocationTrends.map((t) => [t.month, t.count]),
      ),
    ].join('\n\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `assetflow-report-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      {/* Header */}
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Reports &amp; Analytics</h1>
          <p className="page-subtitle">Operational insight across assets, bookings, and maintenance.</p>
        </div>
        <button className="btn btn-secondary" onClick={handleExport}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Stat tiles */}
      <div className="grid-kpi">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="kpi-card" style={{ ['--kpi-accent' as string]: color }}>
            <div className="icon-chip" style={{ background: bg, marginBottom: '0.45rem' }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Chart grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.4rem' }}>
        {/* Utilization by department */}
        <div className="card">
          <CardHeader title="Utilization by department" caption="Share of each department's assets currently allocated" />
          {deptUtilization.length === 0 ? (
            <div className="empty-state">
              <BarChart3 size={28} />
              No department data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deptUtilization} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid stroke="#eef0f7" vertical={false} />
                <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} tickMargin={8} />
                <YAxis
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  {...TOOLTIP_PROPS}
                  cursor={{ fill: 'rgba(79,70,229,0.05)' }}
                  formatter={(value: any, _name: any, item: any) => [
                    `${value}% (${item?.payload?.allocated ?? 0}/${item?.payload?.total ?? 0} allocated)`,
                    'Utilization',
                  ]}
                />
                <Bar dataKey="utilization" fill="#4f46e5" maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Allocation trend */}
        <div className="card">
          <CardHeader title="Allocation trend (6 months)" caption="Assets allocated per month" />
          {!hasTrend ? (
            <div className="empty-state">
              <Activity size={28} />
              No allocations recorded in the last 6 months
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={allocationTrends} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid stroke="#eef0f7" vertical={false} />
                <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} tickMargin={8} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP_PROPS} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Allocations"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="#4f46e5"
                  fillOpacity={0.08}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Maintenance by category */}
        <div className="card">
          <CardHeader title="Maintenance by category" caption="All maintenance requests, by asset category" />
          {maintenanceSorted.length === 0 ? (
            <div className="empty-state">
              <Wrench size={28} />
              No maintenance requests yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart layout="vertical" data={maintenanceSorted} margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#eef0f7" horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  {...TOOLTIP_PROPS}
                  cursor={{ fill: 'rgba(79,70,229,0.05)' }}
                  formatter={(value: any) => [value, 'Requests']}
                />
                <Bar dataKey="count" fill="#4f46e5" barSize={18} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Booking heatmap */}
        <div className="card">
          <CardHeader title="Booking heatmap (last 30 days)" caption="Booking starts by weekday and hour" />
          {bookingHeatmap.length === 0 ? (
            <div className="empty-state">
              <CalendarRange size={28} />
              No bookings in the last 30 days
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '2.4rem repeat(13, 1fr)', gap: 2, alignItems: 'center' }}>
                <div />
                {HEAT_HOURS.map((h) => (
                  <div
                    key={`h-${h}`}
                    style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-3)', textAlign: 'center', paddingBottom: 2 }}
                  >
                    {hourLabel(h)}
                  </div>
                ))}
                {DAY_ORDER.map((day) => (
                  <Fragment key={`d-${day}`}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-3)', textAlign: 'right', paddingRight: 6 }}>
                      {DAY_LABELS[day]}
                    </div>
                    {HEAT_HOURS.map((hour) => {
                      const count = heatCounts.get(`${day}-${hour}`) ?? 0
                      return (
                        <div
                          key={`${day}-${hour}`}
                          title={`${DAY_LABELS[day]} ${String(hour).padStart(2, '0')}:00 — ${count} booking${count === 1 ? '' : 's'}`}
                          style={{ height: 22, borderRadius: 4, background: heatColor(count) }}
                        />
                      )
                    })}
                  </Fragment>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: '0.75rem' }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginRight: 2 }}>fewer</span>
                {HEAT_LEGEND.map((c) => (
                  <span key={c} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
                ))}
                <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginLeft: 2 }}>more</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Asset status breakdown */}
      <div className="card">
        <CardHeader
          title="Asset status breakdown"
          caption={`Distribution of ${summaryStats.totalAssets} asset${summaryStats.totalAssets === 1 ? '' : 's'} across lifecycle states`}
        />
        {statusBreakdown.length === 0 ? (
          <div className="empty-state">
            <Layers size={28} />
            No assets registered yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {statusRows.map(({ status, count }) => {
              const meta = STATUS_META[status] ?? { label: status, color: '#94a3b8' }
              return (
                <div
                  key={status}
                  style={{ display: 'grid', gridTemplateColumns: '170px 1fr 3.5rem', alignItems: 'center', gap: '0.9rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                    <span className="truncate" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)' }}>
                      {meta.label}
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: '#eef0f7', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 4,
                        background: meta.color,
                        width: `${(count / maxStatusCount) * 100}%`,
                        minWidth: count > 0 ? 6 : 0,
                      }}
                    />
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.855rem', fontWeight: 650, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
                    {count}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Resource usage + attention lists */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.4rem' }}>
        {/* Most-used resources */}
        <div className="card">
          <CardHeader title="Most-used resources" caption="Bookable assets ranked by total bookings" />
          {mostBookedAssets.length === 0 ? (
            <div className="empty-state">
              <Calendar size={28} />
              No bookings recorded yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {mostBookedAssets.map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.55rem 0',
                    borderBottom: i < mostBookedAssets.length - 1 ? '1px solid #f1f3f9' : 'none',
                  }}
                >
                  <span style={{ width: '1.1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 650, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <div className="icon-chip" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--brand-50)' }}>
                    <CalendarRange size={13} style={{ color: 'var(--brand-600)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-1)' }}>
                      {a.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 1 }}>
                      {a.category?.name}{a.location ? ` · ${a.location}` : ''}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <span style={{ fontSize: '0.855rem', fontWeight: 650, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
                      {a._count.bookings}
                    </span>{' '}
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                      booking{a._count.bookings === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Idle + needs attention */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
          <div>
            <div className="section-header" style={{ marginBottom: '0.6rem' }}>
              <div className="section-title">Idle assets</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Available, no allocation in 30+ days</span>
            </div>
            <div className="table-wrap">
              {idleAssets.length === 0 ? (
                <div className="empty-state" style={{ padding: '1.5rem' }}>
                  <CheckCircle2 size={28} />
                  No idle assets — everything is in circulation
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr><th>Tag</th><th>Name</th><th>Category</th></tr>
                  </thead>
                  <tbody>
                    {idleAssets.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <span className="badge no-dot" style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', borderColor: 'var(--brand-200)', fontVariantNumeric: 'tabular-nums' }}>
                            {a.tag}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{a.name}</td>
                        <td style={{ color: 'var(--text-2)' }}>{a.category?.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div>
            <div className="section-header" style={{ marginBottom: '0.6rem' }}>
              <div className="section-title">Needs attention</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Damaged or under maintenance</span>
            </div>
            <div className="table-wrap">
              {needsAttention.length === 0 ? (
                <div className="empty-state" style={{ padding: '1.5rem' }}>
                  <CheckCircle2 size={28} />
                  All assets are in good condition
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr><th>Tag</th><th>Name</th><th>Issue</th></tr>
                  </thead>
                  <tbody>
                    {needsAttention.map((a) => {
                      const underMaintenance = String(a.status) === 'UNDER_MAINTENANCE'
                      return (
                        <tr key={a.id}>
                          <td>
                            <span className="badge no-dot" style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', borderColor: 'var(--brand-200)', fontVariantNumeric: 'tabular-nums' }}>
                              {a.tag}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{a.name}</td>
                          <td>
                            {underMaintenance ? (
                              <span className="badge" style={{ background: 'var(--warn-bg)', color: '#92400e', borderColor: 'var(--warn-border)' }}>
                                Under maintenance
                              </span>
                            ) : (
                              <span className="badge" style={{ background: 'var(--danger-bg)', color: '#9f1239', borderColor: 'var(--danger-border)' }}>
                                {a.condition || 'Damaged'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
