'use client'

import { useState, useTransition } from 'react'
import { createAuditCycle, updateAuditItem, closeAuditCycle } from '@/lib/actions/audits'
import { AlertCircle, AlertTriangle, CheckCircle2, ClipboardCheck, Lock, Plus, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const VERIFICATION_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  VERIFIED: { label: 'Verified', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  MISSING: { label: 'Missing', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
  DAMAGED: { label: 'Damaged', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  PENDING: { label: 'Pending', color: '#94a3b8', bg: '#f1f5f9', border: '#e2e8f0' },
}

const verificationColors: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600 border-gray-200',
  VERIFIED: 'bg-green-100 text-green-700 border-green-200',
  MISSING: 'bg-red-100 text-red-700 border-red-200',
  DAMAGED: 'bg-amber-100 text-amber-700 border-amber-200',
}

function AvatarStack({ auditors, size = 24 }: any) {
  const shown = (auditors || []).slice(0, 4)
  const extra = (auditors || []).length - shown.length
  if (shown.length === 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {shown.map((a: any, i: number) => (
        <span
          key={a.id}
          title={a.name}
          style={{
            width: size, height: size, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.round(size * 0.38), fontWeight: 700, color: '#fff',
            background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
            boxShadow: '0 0 0 2px #fff',
            marginLeft: i === 0 ? 0 : -6,
          }}
        >
          {a.name?.charAt(0).toUpperCase()}
        </span>
      ))}
      {extra > 0 && (
        <span style={{
          width: size, height: size, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: Math.round(size * 0.34), fontWeight: 700, color: 'var(--text-2)',
          background: '#eef1f7', boxShadow: '0 0 0 2px #fff', marginLeft: -6,
        }}>
          +{extra}
        </span>
      )}
    </div>
  )
}

function StatusChip({ status, count, label }: any) {
  const meta = VERIFICATION_META[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.28rem',
      fontSize: '0.66rem', fontWeight: 700, padding: '0.15rem 0.5rem',
      borderRadius: 999, background: meta.bg, color: meta.color,
      border: `1px solid ${meta.border}`, fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
    }}>
      {count} {label ?? meta.label}
    </span>
  )
}

function ProgressChips({ items }: any) {
  return (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
      {['VERIFIED', 'MISSING', 'DAMAGED', 'PENDING'].map(s => (
        <StatusChip
          key={s}
          status={s}
          count={items.filter((i: any) => i.verificationStatus === s).length}
        />
      ))}
    </div>
  )
}

export function AuditsClient({ cycles, departments, users, userRole }: any) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '', scopeDepartmentId: '', scopeLocation: '',
    startDate: '', endDate: '', auditorIds: [] as string[],
  })

  const canManage = userRole === 'ASSET_MANAGER' || userRole === 'ADMIN'

  const selectedCycle = cycles.find((c: any) => c.id === selectedCycleId)

  function showMsg(text: string) {
    setMessage(text)
    setTimeout(() => setMessage(''), 4000)
  }

  function scopeLabel(cycle: any) {
    const dept = departments.find((d: any) => d.id === cycle.scopeDepartmentId)?.name
    const parts = [dept || 'All departments']
    if (cycle.scopeLocation) parts.push(cycle.scopeLocation)
    return parts.join(' · ')
  }

  function toggleAuditor(id: string) {
    setForm(f => ({
      ...f,
      auditorIds: f.auditorIds.includes(id)
        ? f.auditorIds.filter(x => x !== id)
        : [...f.auditorIds, id],
    }))
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createAuditCycle({
        name: form.name,
        scopeDepartmentId: form.scopeDepartmentId || undefined,
        scopeLocation: form.scopeLocation || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        auditorIds: form.auditorIds,
      })
      if (result.error) { showMsg('Error: ' + result.error); return }
      showMsg(`Audit cycle created with ${(result as any).assetCount} assets.`)
      setShowCreate(false)
      setForm({ name: '', scopeDepartmentId: '', scopeLocation: '', startDate: '', endDate: '', auditorIds: [] })
    })
  }

  function handleVerify(itemId: string, status: string, notes?: string) {
    startTransition(async () => {
      const result = await updateAuditItem({ auditItemId: itemId, verificationStatus: status as any, notes })
      if (result.error) showMsg('Error: ' + result.error)
    })
  }

  function handleClose(cycleId: string) {
    startTransition(async () => {
      const result = await closeAuditCycle(cycleId)
      if (result.error) { showMsg('Error: ' + result.error); return }
      showMsg(`Cycle closed. ${(result as any).missingCount} assets marked LOST.`)
      setShowCloseConfirm(null)
      setSelectedCycleId(null)
    })
  }

  const flaggedItems = selectedCycle?.items.filter((i: any) =>
    i.verificationStatus === 'MISSING' || i.verificationStatus === 'DAMAGED'
  ) || []
  const flaggedCount = flaggedItems.length

  const closingCycle = showCloseConfirm ? cycles.find((c: any) => c.id === showCloseConfirm) : null
  const closingMissing = closingCycle?.items.filter((i: any) => i.verificationStatus === 'MISSING').length || 0
  const closingDamaged = closingCycle?.items.filter((i: any) => i.verificationStatus === 'DAMAGED').length || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      {/* Page header */}
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Audit Cycles</h1>
          <p className="page-subtitle">Structured verification with auto-generated discrepancy reports.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Cycle
          </button>
        )}
      </div>

      {message && (
        <div className={`inline-alert ${message.startsWith('Error') ? 'error' : 'success'}`}>
          {message.startsWith('Error') ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          <span>{message}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.4rem', alignItems: 'flex-start' }}>
        {/* Cycles list */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {cycles.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <ClipboardCheck size={28} />
                No audit cycles yet
              </div>
            </div>
          ) : cycles.map((cycle: any) => {
            const selected = selectedCycleId === cycle.id
            return (
              <div
                key={cycle.id}
                className="card"
                style={{
                  padding: '0.95rem 1rem',
                  cursor: 'pointer',
                  borderColor: selected ? 'var(--brand-400)' : 'var(--border)',
                  boxShadow: selected ? '0 0 0 3px var(--brand-100), var(--shadow-sm)' : undefined,
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onClick={() => setSelectedCycleId(cycle.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="truncate" style={{ fontWeight: 650, fontSize: '0.875rem', color: 'var(--text-1)', flex: 1 }}>
                    {cycle.name}
                  </span>
                  <span className={`badge ${cycle.status === 'OPEN' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {cycle.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-2)', marginTop: '0.3rem' }}>
                  {scopeLabel(cycle)} · {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.6rem' }}>
                  <AvatarStack auditors={cycle.auditors} size={22} />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {cycle._count?.items ?? cycle.items.length} assets
                  </span>
                </div>
                <div style={{ marginTop: '0.55rem' }}>
                  <ProgressChips items={cycle.items} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Cycle detail */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {!selectedCycle ? (
            <div className="card">
              <div className="empty-state">
                <ClipboardCheck size={28} />
                Select an audit cycle to view details
              </div>
            </div>
          ) : (
            <>
              {/* Cycle header */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <h2 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.01em' }}>
                        {selectedCycle.name}
                      </h2>
                      <span className={`badge ${selectedCycle.status === 'OPEN' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {selectedCycle.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: '0.35rem' }}>
                      {scopeLabel(selectedCycle)} · {formatDate(selectedCycle.startDate)} – {formatDate(selectedCycle.endDate)}
                    </div>
                  </div>
                  {canManage && selectedCycle.status === 'OPEN' && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setShowCloseConfirm(selectedCycle.id)}
                    >
                      <Lock size={14} /> Close Cycle
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '0.95rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                    <AvatarStack auditors={selectedCycle.auditors} />
                    <span className="truncate" style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 600 }}>
                      {selectedCycle.auditors?.map((a: any) => a.name).join(', ')}
                    </span>
                  </div>
                  <ProgressChips items={selectedCycle.items} />
                </div>
              </div>

              {/* Discrepancy report */}
              {flaggedCount > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  <span className="section-title">Discrepancy Report</span>
                  <div className="inline-alert warning">
                    <AlertTriangle size={15} />
                    <span>
                      <strong>{flaggedCount} discrepanc{flaggedCount === 1 ? 'y' : 'ies'}</strong> flagged — report generated automatically
                    </span>
                  </div>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Asset</th>
                          <th>Category</th>
                          <th>Expected Location</th>
                          <th>Status</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flaggedItems.map((item: any) => (
                          <tr key={item.id}>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                                <span className="badge no-dot" style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', borderColor: 'var(--brand-200)', fontVariantNumeric: 'tabular-nums' }}>
                                  {item.asset?.tag}
                                </span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)' }}>{item.asset?.name}</span>
                              </div>
                            </td>
                            <td style={{ color: 'var(--text-2)' }}>{item.asset?.category?.name}</td>
                            <td style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>{item.expectedLocation || '—'}</td>
                            <td>
                              <span className={`badge ${verificationColors[item.verificationStatus]}`}>
                                {VERIFICATION_META[item.verificationStatus].label}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-2)' }}>{item.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : selectedCycle.items.length > 0 && (
                <div className="inline-alert success">
                  <CheckCircle2 size={15} />
                  <span>No discrepancies flagged so far</span>
                </div>
              )}

              {/* Asset checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                <div className="section-header" style={{ marginBottom: 0 }}>
                  <span className="section-title">Verification Checklist</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {selectedCycle.items.length} asset{selectedCycle.items.length !== 1 ? 's' : ''} in scope
                  </span>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Asset</th>
                        <th>Category</th>
                        <th>Expected Location</th>
                        <th>Verification</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCycle.items.length === 0 ? (
                        <tr>
                          <td colSpan={5}>
                            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                              <ClipboardCheck size={28} />
                              No assets in scope
                            </div>
                          </td>
                        </tr>
                      ) : selectedCycle.items.map((item: any) => (
                        <AuditItemRow
                          key={item.id}
                          item={item}
                          isLocked={selectedCycle.status === 'CLOSED'}
                          onVerify={handleVerify}
                          isPending={isPending}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="dialog">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <h2 className="dialog-title">Create Audit Cycle</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Cycle Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Q3 2024 Engineering Audit" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                <div className="form-group">
                  <label className="form-label">Scope Department</label>
                  <select className="form-select" value={form.scopeDepartmentId} onChange={e => setForm(f => ({ ...f, scopeDepartmentId: e.target.value }))}>
                    <option value="">— All departments —</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Scope Location</label>
                  <input className="form-input" value={form.scopeLocation} onChange={e => setForm(f => ({ ...f, scopeLocation: e.target.value }))} placeholder="e.g. 3rd Floor" />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input type="date" className="form-input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input type="date" className="form-input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Assign Auditors *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem', maxHeight: 200, overflowY: 'auto', padding: 2 }}>
                  {users.map((u: any) => {
                    const selected = form.auditorIds.includes(u.id)
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleAuditor(u.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.4rem 0.6rem', borderRadius: 999, cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, textAlign: 'left',
                          background: selected ? 'var(--brand-50)' : '#fff',
                          border: selected ? '1px solid var(--brand-300)' : '1px solid var(--border-strong)',
                          color: selected ? 'var(--brand-700)' : 'var(--text-2)',
                          transition: 'all 0.15s ease',
                          minWidth: 0,
                        }}
                      >
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.62rem', fontWeight: 700,
                          background: selected ? 'linear-gradient(135deg, var(--brand-500), var(--brand-700))' : '#eef1f7',
                          color: selected ? '#fff' : 'var(--text-2)',
                        }}>
                          {u.name?.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate">{u.name}</span>
                      </button>
                    )
                  })}
                </div>
                <span className="form-hint">Tap to toggle — select at least one auditor.</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary"
                onClick={handleCreate}
                disabled={!form.name || !form.startDate || !form.endDate || form.auditorIds.length === 0 || isPending}>
                {isPending ? 'Creating...' : 'Create Cycle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirmation */}
      {showCloseConfirm && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowCloseConfirm(null) }}>
          <div className="dialog" style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <h2 className="dialog-title" style={{ marginBottom: '0.9rem' }}>Close Audit Cycle</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCloseConfirm(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="inline-alert warning">
              <AlertTriangle size={15} />
              <span>This action is irreversible. <strong>Missing items will be marked Lost. The cycle will be locked.</strong></span>
            </div>
            <div style={{ background: '#fafbfe', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', margin: '0.9rem 0 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-1)' }}>
                <StatusChip status="MISSING" count={closingMissing} />
                <span>asset{closingMissing !== 1 ? 's' : ''} will have status set to <strong>Lost</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-1)' }}>
                <StatusChip status="DAMAGED" count={closingDamaged} />
                <span>asset{closingDamaged !== 1 ? 's' : ''} will have condition set to <strong>Damaged</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-1)' }}>
                <Lock size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                <span>Audit items become read-only — no further edits</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowCloseConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleClose(showCloseConfirm)} disabled={isPending}>
                <Lock size={14} /> {isPending ? 'Closing...' : 'Close Cycle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AuditItemRow({ item, isLocked, onVerify, isPending }: any) {
  const [notes, setNotes] = useState(item.notes || '')
  const [status, setStatus] = useState(item.verificationStatus)
  const [editing, setEditing] = useState(false)

  function selectStatus(value: string) {
    setStatus(status === value ? 'PENDING' : value)
    setEditing(true)
  }

  function handleSave() {
    onVerify(item.id, status, notes)
    setEditing(false)
  }

  const rowBg = status === 'MISSING' ? 'var(--danger-bg)' : status === 'DAMAGED' ? 'var(--warn-bg)' : 'transparent'

  return (
    <tr style={{ background: rowBg }}>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
          <span className="badge no-dot" style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', borderColor: 'var(--brand-200)', fontVariantNumeric: 'tabular-nums' }}>
            {item.asset?.tag}
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)' }}>{item.asset?.name}</span>
        </div>
      </td>
      <td style={{ color: 'var(--text-2)' }}>{item.asset?.category?.name}</td>
      <td style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>{item.expectedLocation || '—'}</td>
      <td>
        {isLocked ? (
          <span className={`badge ${verificationColors[status]}`}>
            {VERIFICATION_META[status]?.label || status}
          </span>
        ) : (
          <div style={{ display: 'inline-flex', background: '#eef0f7', border: '1px solid var(--border)', borderRadius: 8, padding: 2, gap: 2 }}>
            {['VERIFIED', 'MISSING', 'DAMAGED'].map(value => {
              const meta = VERIFICATION_META[value]
              const active = status === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectStatus(value)}
                  disabled={isPending}
                  style={{
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '0.7rem', fontWeight: 650, padding: '0.28rem 0.55rem', borderRadius: 6,
                    background: active ? meta.bg : 'transparent',
                    color: active ? meta.color : 'var(--text-3)',
                    boxShadow: active ? `inset 0 0 0 1px ${meta.border}` : 'none',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {meta.label}
                </button>
              )
            })}
          </div>
        )}
      </td>
      <td>
        {isLocked ? (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{notes || '—'}</span>
        ) : (
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input
              className="form-input"
              style={{ fontSize: '0.78rem', padding: '0.32rem 0.6rem', minWidth: 130 }}
              value={notes}
              onChange={e => { setNotes(e.target.value); setEditing(true) }}
              placeholder="Add a note…"
            />
            {editing && (
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={isPending}>Save</button>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}
