'use client'

import { useState, useTransition } from 'react'
import { createBooking, cancelBooking, getBookingsForAsset } from '@/lib/actions/bookings'
import { Calendar, Plus, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react'
import { bookingStatusColors, formatDate, formatTime, formatDateTime } from '@/lib/utils'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function BookingsClient({ bookableAssets, activeBookings, userId }: any) {
  const [selectedAssetId, setSelectedAssetId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [dayBookings, setDayBookings] = useState<any[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ startTime: '', endTime: '' })
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ text: string; type: string }>({ text: '', type: '' })
  const [conflictDetail, setConflictDetail] = useState<any>(null)

  const selectedAsset = bookableAssets.find((a: any) => a.id === selectedAssetId)

  async function loadDayBookings() {
    if (!selectedAssetId) return
    setLoadingBookings(true)
    try {
      const bookings = await getBookingsForAsset(selectedAssetId, selectedDate)
      setDayBookings(bookings)
    } finally {
      setLoadingBookings(false)
    }
  }

  function showMsg(text: string, type = 'success') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  function handleAssetChange(assetId: string) {
    setSelectedAssetId(assetId)
    setDayBookings([])
    if (assetId) {
      setTimeout(() => loadDayBookings(), 100)
    }
  }

  function handleDateChange(date: string) {
    setSelectedDate(date)
    if (selectedAssetId) setTimeout(() => loadDayBookings(), 100)
  }

  function handleBook() {
    if (!selectedAssetId || !form.startTime || !form.endTime) return
    setConflictDetail(null)

    const startDateTime = `${selectedDate}T${form.startTime}:00`
    const endDateTime = `${selectedDate}T${form.endTime}:00`

    startTransition(async () => {
      const result = await createBooking({
        assetId: selectedAssetId,
        startTime: startDateTime,
        endTime: endDateTime,
      })

      if ((result as any).conflict) {
        setConflictDetail((result as any).conflict)
        showMsg(result.error || 'Slot unavailable', 'error')
        return
      }

      if (result.error) {
        showMsg(result.error, 'error')
        return
      }

      showMsg(`Booking confirmed for ${selectedAsset?.name}!`)
      setShowForm(false)
      setForm({ startTime: '', endTime: '' })
      await loadDayBookings()
    })
  }

  function handleCancel(bookingId: string) {
    startTransition(async () => {
      const result = await cancelBooking(bookingId)
      if (result.error) { showMsg(result.error, 'error'); return }
      showMsg('Booking cancelled.')
      await loadDayBookings()
    })
  }

  // Render a booking block on the timeline
  function getBookingStyle(booking: any) {
    const start = new Date(booking.startTime)
    const end = new Date(booking.endTime)
    const startHour = start.getHours() + start.getMinutes() / 60
    const endHour = end.getHours() + end.getMinutes() / 60
    const top = (startHour / 24) * 100
    const height = ((endHour - startHour) / 24) * 100

    const colors: Record<string, { bg: string; text: string; border: string }> = {
      UPCOMING: { bg: '#eff6ff', text: '#1d4ed8', border: '#3b82f6' },
      ONGOING: { bg: '#f0fdf4', text: '#166534', border: '#22c55e' },
      COMPLETED: { bg: '#f1f5f9', text: '#475569', border: '#94a3b8' },
      CANCELLED: { bg: '#fef2f2', text: '#991b1b', border: '#f87171' },
    }
    const color = colors[booking.status] || colors.UPCOMING
    return { ...color, topPct: top, heightPct: height }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Resource Booking</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>Book shared resources by time slot with automatic overlap validation</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} disabled={!selectedAssetId}>
          <Plus size={16} /> Book Slot
        </button>
      </div>

      {message.text && (
        <div style={{
          background: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: '1px solid',
          borderColor: message.type === 'error' ? '#fecaca' : '#bbf7d0',
          color: message.type === 'error' ? '#991b1b' : '#166534',
          padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem',
          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
        }}>
          {message.type === 'error' ? <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} /> : <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />}
          <div>
            <div>{message.text}</div>
            {conflictDetail && (
              <div style={{ marginTop: '0.375rem', fontSize: '0.8rem', opacity: 0.85 }}>
                Conflicting booking: {formatTime(conflictDetail.startTime)} – {formatTime(conflictDetail.endTime)} by {conflictDetail.requestedBy?.name}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resource & Date selector */}
      <div className="card filter-bar">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Select Resource</label>
          <select className="form-select" value={selectedAssetId} onChange={e => handleAssetChange(e.target.value)}>
            <option value="">— Choose a bookable resource —</option>
            {bookableAssets.map((a: any) => (
              <option key={a.id} value={a.id}>{a.name} ({a.category?.name}){a.location ? ` — ${a.location}` : ''}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" className="form-input" value={selectedDate}
            onChange={e => handleDateChange(e.target.value)} />
        </div>
        {selectedAssetId && (
          <button className="btn btn-secondary" style={{ alignSelf: 'flex-end' }} onClick={loadDayBookings}>
            Refresh
          </button>
        )}
      </div>

      {showForm && selectedAssetId && (
        <div className="card" style={{ borderColor: '#bfdbfe', background: '#eff6ff' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e40af', marginBottom: '1rem' }}>
            Book: {selectedAsset?.name} — {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input type="time" className="form-input" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input type="time" className="form-input" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
            <button className="btn btn-primary" onClick={handleBook}
              disabled={!form.startTime || !form.endTime || isPending}>
              {isPending ? 'Booking...' : 'Confirm Booking'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#1e40af', opacity: 0.8 }}>
            ℹ Back-to-back bookings are allowed (a slot ending at 10:00 does not conflict with one starting at 10:00).
          </div>
        </div>
      )}

      {selectedAssetId && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
          {/* Timeline view */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} style={{ color: '#2563eb' }} />
              <span style={{ fontWeight: 600 }}>{selectedAsset?.name}</span>
              <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                — {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <div className="timeline-grid" style={{ position: 'relative' }}>
                {HOURS.map(hour => {
                  const hourBookings = dayBookings.filter(b => {
                    const start = new Date(b.startTime).getHours()
                    const end = new Date(b.endTime).getHours()
                    return start <= hour && end > hour
                  })
                  return (
                    <div key={hour} className="timeline-hour">
                      <div className="timeline-hour-label">
                        {String(hour).padStart(2, '0')}:00
                      </div>
                      <div className="timeline-slot">
                        {hourBookings.map(b => (
                          <div
                            key={b.id}
                            style={{
                              background: b.status === 'UPCOMING' ? '#dbeafe' : b.status === 'ONGOING' ? '#dcfce7' : '#f1f5f9',
                              borderLeft: `3px solid ${b.status === 'UPCOMING' ? '#3b82f6' : b.status === 'ONGOING' ? '#22c55e' : '#94a3b8'}`,
                              padding: '0.125rem 0.5rem',
                              fontSize: '0.7rem',
                              borderRadius: '0 0.25rem 0.25rem 0',
                              marginBottom: '0.125rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>
                              {formatTime(b.startTime)}–{formatTime(b.endTime)}
                            </span>
                            <span style={{ color: '#64748b' }}>{b.requestedBy?.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {loadingBookings && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Today's bookings list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card">
              <div className="section-title" style={{ marginBottom: '0.75rem' }}>Day's Bookings</div>
              {dayBookings.length === 0 ? (
                <div className="empty-state" style={{ padding: '1rem' }}>No bookings for this day</div>
              ) : dayBookings.map(b => (
                <div key={b.id} style={{ padding: '0.625rem', background: '#f8fafc', borderRadius: '0.375rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{formatTime(b.startTime)} – {formatTime(b.endTime)}</span>
                    <span className={`badge ${bookingStatusColors[b.status]}`}>{b.status}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.requestedBy?.name}</div>
                  {b.requestedById === userId && b.status === 'UPCOMING' && (
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.375rem', color: '#ef4444' }}
                      onClick={() => handleCancel(b.id)}>
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Active bookings across all resources */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: '0.75rem' }}>My Active Bookings</div>
              {activeBookings.filter((b: any) => b.requestedById === userId).length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No active bookings</div>
              ) : activeBookings.filter((b: any) => b.requestedById === userId).map((b: any) => (
                <div key={b.id} style={{ padding: '0.625rem', background: '#f8fafc', borderRadius: '0.375rem', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{b.asset.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {formatDateTime(b.startTime)} – {formatTime(b.endTime)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!selectedAssetId && (
        <div className="card">
          <div className="empty-state">
            <Calendar size={40} />
            <div style={{ marginTop: '0.5rem', fontWeight: 500 }}>Select a resource above to view its calendar</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Overlap validation prevents double-booking. Back-to-back slots are allowed.</div>
          </div>
        </div>
      )}
    </div>
  )
}
