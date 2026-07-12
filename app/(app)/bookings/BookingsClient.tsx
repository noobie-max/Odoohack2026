'use client'

import { useState, useTransition } from 'react'
import { createBooking, cancelBooking, rescheduleBooking, getBookingsForAsset } from '@/lib/actions/bookings'
import {
  Calendar, CalendarClock, Plus, AlertCircle, CheckCircle2, Clock, X, Info, RefreshCw,
} from 'lucide-react'
import { bookingStatusColors, formatDate, formatTime, formatDateTime } from '@/lib/utils'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function BookingsClient({ bookableAssets, activeBookings, userId, role }: any) {
  const [selectedAssetId, setSelectedAssetId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [dayBookings, setDayBookings] = useState<any[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ startTime: '', endTime: '' })
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ text: string; type: string }>({ text: '', type: '' })
  const [conflictDetail, setConflictDetail] = useState<any>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<any>(null)
  const [rescheduleForm, setRescheduleForm] = useState({ start: '', end: '' })
  const [rescheduleError, setRescheduleError] = useState('')

  const selectedAsset = bookableAssets.find((a: any) => a.id === selectedAssetId)
  const canManage = role === 'ADMIN' || role === 'ASSET_MANAGER'
  const myBookings = activeBookings.filter((b: any) => b.requestedById === userId)

  async function loadDayBookings(assetId: string = selectedAssetId, date: string = selectedDate) {
    if (!assetId) return
    setLoadingBookings(true)
    try {
      const bookings = await getBookingsForAsset(assetId, date)
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
      loadDayBookings(assetId, selectedDate)
    }
  }

  function handleDateChange(date: string) {
    setSelectedDate(date)
    if (selectedAssetId) loadDayBookings(selectedAssetId, date)
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

  function toLocalInput(value: string | Date) {
    const d = new Date(value)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function openReschedule(booking: any, assetName: string) {
    setRescheduleError('')
    setRescheduleForm({ start: toLocalInput(booking.startTime), end: toLocalInput(booking.endTime) })
    setRescheduleTarget({ ...booking, assetName })
  }

  function handleReschedule() {
    if (!rescheduleTarget || !rescheduleForm.start || !rescheduleForm.end) return
    setRescheduleError('')
    startTransition(async () => {
      const result = await rescheduleBooking(rescheduleTarget.id, rescheduleForm.start, rescheduleForm.end)
      if (result.error) { setRescheduleError(result.error); return }
      showMsg('Booking rescheduled.')
      setRescheduleTarget(null)
      await loadDayBookings()
    })
  }

  function canReschedule(b: any) {
    return b.status === 'UPCOMING' && (b.requestedById === userId || canManage)
  }

  // Position a block on the 24h timeline as % of the day
  function blockGeometry(start: Date, end: Date) {
    const dayStart = new Date(`${selectedDate}T00:00:00`)
    const startH = Math.max(0, (start.getTime() - dayStart.getTime()) / 3600000)
    const endH = Math.min(24, (end.getTime() - dayStart.getTime()) / 3600000)
    if (endH <= startH) return null
    return {
      top: `${(startH / 24) * 100}%`,
      height: `${Math.max(((endH - startH) / 24) * 100, 1.4)}%`,
    }
  }

  // Live conflict preview — mirrors the server's strict-inequality rule
  const previewStart = showForm && selectedAssetId && form.startTime
    ? new Date(`${selectedDate}T${form.startTime}:00`) : null
  const previewEnd = showForm && selectedAssetId && form.endTime
    ? new Date(`${selectedDate}T${form.endTime}:00`) : null
  const hasPreviewRange = !!(previewStart && previewEnd && previewEnd > previewStart)
  const overlapping = hasPreviewRange
    ? dayBookings.some(b =>
        (b.status === 'UPCOMING' || b.status === 'ONGOING') &&
        previewStart! < new Date(b.endTime) && previewEnd! > new Date(b.startTime))
    : false
  const ghostGeometry = overlapping ? blockGeometry(previewStart!, previewEnd!) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Resource Booking</h1>
          <p className="page-subtitle">Book shared rooms, vehicles, and equipment by time slot.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} disabled={!selectedAssetId}>
          <Plus size={16} /> Book Slot
        </button>
      </div>

      {message.text && (
        <div className={`inline-alert ${message.type === 'error' ? 'error' : 'success'}`}>
          {message.type === 'error'
            ? <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            : <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 2 }} />}
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
        <div className="form-group" style={{ flex: 1, minWidth: 240 }}>
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
          <button className="btn btn-secondary" style={{ alignSelf: 'flex-end' }} onClick={() => loadDayBookings()}>
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      </div>

      {showForm && selectedAssetId && (
        <div className="card" style={{ borderColor: 'var(--brand-200)', background: 'var(--brand-50)' }}>
          <div className="section-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarClock size={16} style={{ color: 'var(--brand-600)' }} />
            Book: {selectedAsset?.name} — {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input type="time" className="form-input" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input type="time" className="form-input" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
            <button className="btn btn-primary" onClick={handleBook}
              disabled={!form.startTime || !form.endTime || isPending || overlapping}>
              {isPending ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Booking...</> : 'Confirm Booking'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          {overlapping ? (
            <div className="inline-alert error" style={{ marginTop: '0.8rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              This slot overlaps an existing booking. Back-to-back bookings are allowed.
            </div>
          ) : (
            <div className="form-hint" style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Info size={13} style={{ flexShrink: 0 }} />
              Back-to-back bookings are allowed (a slot ending at 10:00 does not conflict with one starting at 10:00).
            </div>
          )}
        </div>
      )}

      {selectedAssetId && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.4rem' }}>
          {/* Timeline view */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} style={{ color: 'var(--brand-600)' }} />
              <span style={{ fontWeight: 650, color: 'var(--text-1)' }}>{selectedAsset?.name}</span>
              <span className="text-muted">
                — {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
              <div className="timeline-grid" style={{ border: 'none', borderRadius: 0 }}>
                <div style={{ position: 'relative' }}>
                  {HOURS.map(hour => (
                    <div key={hour} className="timeline-hour">
                      <div className="timeline-hour-label">
                        {String(hour).padStart(2, '0')}:00
                      </div>
                      <div className="timeline-slot" />
                    </div>
                  ))}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: 'calc(4.5rem + 1px)', right: 0 }}>
                    {dayBookings.map(b => {
                      const geometry = blockGeometry(new Date(b.startTime), new Date(b.endTime))
                      if (!geometry) return null
                      return (
                        <div
                          key={b.id}
                          className={`booking-block ${b.requestedById === userId ? 'mine' : 'other'}`}
                          style={{ ...geometry, left: 6, right: 8, opacity: b.status === 'COMPLETED' ? 0.55 : 1 }}
                          title={`${b.requestedBy?.name}: ${formatTime(b.startTime)}–${formatTime(b.endTime)} (${b.status})`}
                        >
                          {b.requestedBy?.name} · {formatTime(b.startTime)}–{formatTime(b.endTime)}
                        </div>
                      )
                    })}
                    {ghostGeometry && (
                      <div
                        className="booking-block conflict"
                        style={{ ...ghostGeometry, left: 6, right: 8 }}
                        title={`Requested ${form.startTime}–${form.endTime} overlaps an existing booking`}
                      >
                        Requested {form.startTime}–{form.endTime} — conflict
                      </div>
                    )}
                  </div>
                </div>
                {loadingBookings && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Today's bookings list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
            <div className="card">
              <div className="section-title" style={{ marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={15} style={{ color: 'var(--brand-600)' }} /> Day&apos;s Bookings
              </div>
              {dayBookings.length === 0 ? (
                <div className="empty-state" style={{ padding: '1.25rem 1rem' }}>
                  <Calendar size={28} />
                  No bookings for this day
                </div>
              ) : dayBookings.map(b => (
                <div key={b.id} style={{ padding: '0.7rem 0.8rem', background: '#fafbfe', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '0.55rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 650, fontSize: '0.8rem', color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatTime(b.startTime)} – {formatTime(b.endTime)}
                    </span>
                    <span className={`badge ${bookingStatusColors[b.status]}`}>{b.status}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{b.requestedBy?.name}</div>
                  {(canReschedule(b) || (b.requestedById === userId && b.status === 'UPCOMING')) && (
                    <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.5rem' }}>
                      {canReschedule(b) && (
                        <button className="btn btn-secondary btn-sm" onClick={() => openReschedule(b, selectedAsset?.name)}>
                          Reschedule
                        </button>
                      )}
                      {b.requestedById === userId && b.status === 'UPCOMING' && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                          onClick={() => handleCancel(b.id)}>
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Active bookings across all resources */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarClock size={15} style={{ color: '#7c3aed' }} /> My Active Bookings
              </div>
              {myBookings.length === 0 ? (
                <div className="empty-state" style={{ padding: '1.25rem 1rem' }}>
                  <CalendarClock size={28} />
                  No active bookings
                </div>
              ) : myBookings.map((b: any) => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', padding: '0.7rem 0.8rem', background: '#fafbfe', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '0.55rem' }}>
                  <div className="icon-chip" style={{ background: '#f5f3ff', width: 32, height: 32, borderRadius: 8 }}>
                    <CalendarClock size={15} style={{ color: '#7c3aed' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 650, fontSize: '0.8rem', color: 'var(--text-1)' }}>{b.asset.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', marginTop: 1 }}>
                      {formatDateTime(b.startTime)} – {formatTime(b.endTime)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.4rem' }}>
                      <span className={`badge ${bookingStatusColors[b.status]}`}>{b.status}</span>
                      {canReschedule(b) && (
                        <button className="btn btn-secondary btn-sm" onClick={() => openReschedule(b, b.asset?.name)}>
                          Reschedule
                        </button>
                      )}
                    </div>
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
            <Calendar size={28} />
            <div style={{ marginTop: '0.5rem', fontWeight: 500 }}>Select a resource above to view its calendar</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Overlap validation prevents double-booking. Back-to-back slots are allowed.</div>
          </div>
        </div>
      )}

      {rescheduleTarget && (
        <div className="overlay" onClick={() => { if (!isPending) setRescheduleTarget(null) }}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.6rem' }}>
              <div className="dialog-title" style={{ marginBottom: '0.3rem' }}>Reschedule Booking</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setRescheduleTarget(null)}>
                <X size={16} />
              </button>
            </div>
            <p className="text-muted" style={{ margin: '0 0 1.1rem', fontSize: '0.82rem' }}>
              {rescheduleTarget.assetName} · currently {formatDate(rescheduleTarget.startTime)}, {formatTime(rescheduleTarget.startTime)} – {formatTime(rescheduleTarget.endTime)}
            </p>
            {rescheduleError && (
              <div className="inline-alert error" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                {rescheduleError}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
              <div className="form-group">
                <label className="form-label">New Start *</label>
                <input type="datetime-local" className="form-input" value={rescheduleForm.start}
                  onChange={e => setRescheduleForm(f => ({ ...f, start: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">New End *</label>
                <input type="datetime-local" className="form-input" value={rescheduleForm.end}
                  onChange={e => setRescheduleForm(f => ({ ...f, end: e.target.value }))} />
              </div>
            </div>
            <div className="form-hint" style={{ marginTop: '0.5rem' }}>
              Back-to-back bookings are allowed. The slot must not overlap another booking on this resource.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.4rem' }}>
              <button className="btn btn-secondary" onClick={() => setRescheduleTarget(null)} disabled={isPending}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleReschedule}
                disabled={!rescheduleForm.start || !rescheduleForm.end || isPending}>
                {isPending ? 'Saving...' : 'Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
