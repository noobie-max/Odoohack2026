'use client'

import { useState, useTransition } from 'react'
import { createAuditCycle, updateAuditItem, closeAuditCycle } from '@/lib/actions/audits'
import { AlertTriangle, CheckCircle, ClipboardCheck, Plus, Lock } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const VERIFICATION_OPTIONS = [
  { value: 'PENDING', label: 'Pending', color: '#94a3b8' },
  { value: 'VERIFIED', label: 'Verified', color: '#22c55e' },
  { value: 'MISSING', label: 'Missing', color: '#ef4444' },
  { value: 'DAMAGED', label: 'Damaged', color: '#f59e0b' },
]

const verificationColors: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  VERIFIED: 'bg-green-100 text-green-700',
  MISSING: 'bg-red-100 text-red-700',
  DAMAGED: 'bg-amber-100 text-amber-700',
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

  const flaggedCount = selectedCycle?.items.filter((i: any) =>
    i.verificationStatus === 'MISSING' || i.verificationStatus === 'DAMAGED'
  ).length || 0

  return (
    <div style={{ display: 'flex', gap: '1.5rem' }}>
      {/* Cycles list */}
      <div style={{ width: 280, flexShrink: 0 }}>
        <div className="section-header" style={{ marginBottom: '0.75rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Audit Cycles</h1>
          {canManage && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> New
            </button>
          )}
        </div>

        {cycles.length === 0 ? (
          <div className="empty-state">No audit cycles yet</div>
        ) : cycles.map((cycle: any) => {
          const flagged = cycle.items.filter((i: any) => i.verificationStatus === 'MISSING' || i.verificationStatus === 'DAMAGED').length
          const verified = cycle.items.filter((i: any) => i.verificationStatus === 'VERIFIED').length
          return (
            <div
              key={cycle.id}
              className="card"
              style={{
                marginBottom: '0.75rem',
                cursor: 'pointer',
                borderColor: selectedCycleId === cycle.id ? '#3b82f6' : '#e2e8f0',
                borderWidth: 2,
              }}
              onClick={() => setSelectedCycleId(cycle.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', flex: 1 }}>{cycle.name}</span>
                {cycle.status === 'CLOSED'
                  ? <Lock size={14} style={{ color: '#94a3b8' }} />
                  : <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
              </div>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', fontSize: '0.7rem' }}>
                <span style={{ background: '#f0fdf4', color: '#166534', padding: '0.125rem 0.375rem', borderRadius: '9999px' }}>
                  ✓ {verified}
                </span>
                {flagged > 0 && (
                  <span style={{ background: '#fef2f2', color: '#991b1b', padding: '0.125rem 0.375rem', borderRadius: '9999px' }}>
                    ⚠ {flagged} flagged
                  </span>
                )}
                <span style={{ color: '#94a3b8' }}>{cycle._count?.items || cycle.items.length} total</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cycle detail */}
      <div style={{ flex: 1 }}>
        {message && (
          <div style={{ background: message.startsWith('Error') ? '#fef2f2' : '#f0fdf4', border: '1px solid', borderColor: message.startsWith('Error') ? '#fecaca' : '#bbf7d0', color: message.startsWith('Error') ? '#991b1b' : '#166534', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {message}
          </div>
        )}

        {!selectedCycle ? (
          <div className="card">
            <div className="empty-state">
              <ClipboardCheck size={40} />
              <div style={{ marginTop: '0.5rem', fontWeight: 500 }}>Select an audit cycle to view details</div>
            </div>
          </div>
        ) : (
          <>
            {/* Cycle header */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{selectedCycle.name}</h2>
                    <span className={`badge ${selectedCycle.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {selectedCycle.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {formatDate(selectedCycle.startDate)} — {formatDate(selectedCycle.endDate)}
                    {selectedCycle.auditors?.length > 0 && ` · Auditors: ${selectedCycle.auditors.map((a: any) => a.name).join(', ')}`}
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

              {/* Flagged banner */}
              {flaggedCount > 0 && (
                <div className="alert-banner" style={{ marginTop: '0.75rem' }}>
                  <AlertTriangle size={16} />
                  <span><strong>{flaggedCount} asset{flaggedCount !== 1 ? 's' : ''}</strong> flagged (Missing or Damaged) — auto-generated discrepancy report</span>
                </div>
              )}
              {flaggedCount === 0 && selectedCycle.items.length > 0 && (
                <div style={{ marginTop: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.625rem', fontSize: '0.8rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} /> No discrepancies flagged so far
                </div>
              )}
            </div>

            {/* Asset checklist */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                    <tr><td colSpan={5}><div className="empty-state">No assets in scope</div></td></tr>
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
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="dialog">
            <h2 className="dialog-title">Create Audit Cycle</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Cycle Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Q3 2024 Engineering Audit" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                <label className="form-label">Assign Auditors * (hold Ctrl/Cmd to multi-select)</label>
                <select
                  multiple
                  className="form-select"
                  style={{ height: 120 }}
                  value={form.auditorIds}
                  onChange={e => setForm(f => ({ ...f, auditorIds: Array.from(e.target.selectedOptions, o => o.value) }))}
                >
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role.replace(/_/g, ' ')})</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
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
          <div className="dialog" style={{ maxWidth: 420 }}>
            <h2 className="dialog-title" style={{ color: '#dc2626' }}>⚠ Close Audit Cycle</h2>
            <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1rem' }}>
              This action is <strong>irreversible</strong>. Once closed:
            </p>
            <ul style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1rem', paddingLeft: '1.25rem' }}>
              <li>No further edits to audit items will be allowed</li>
              <li>All assets still marked <strong>MISSING</strong> will have their status set to <strong>LOST</strong></li>
              <li>A discrepancy report will be auto-generated for flagged items</li>
            </ul>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowCloseConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleClose(showCloseConfirm)} disabled={isPending}>
                {isPending ? 'Closing...' : 'Close Cycle — I Understand'}
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

  const statusColor: Record<string, string> = {
    PENDING: '#94a3b8', VERIFIED: '#22c55e', MISSING: '#ef4444', DAMAGED: '#f59e0b'
  }

  function handleSave() {
    onVerify(item.id, status, notes)
    setEditing(false)
  }

  return (
    <tr style={{ background: status === 'MISSING' ? '#fff5f5' : status === 'DAMAGED' ? '#fffbeb' : 'transparent' }}>
      <td>
        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem' }}>{item.asset?.tag}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.asset?.name}</div>
      </td>
      <td style={{ color: '#64748b' }}>{item.asset?.category?.name}</td>
      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.expectedLocation || '—'}</td>
      <td>
        {isLocked ? (
          <span className={`badge ${status === 'VERIFIED' ? 'bg-green-100 text-green-700' : status === 'MISSING' ? 'bg-red-100 text-red-700' : status === 'DAMAGED' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
            {status}
          </span>
        ) : (
          <select
            className="form-select"
            style={{ width: 'auto', fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderColor: statusColor[status] }}
            value={status}
            onChange={e => { setStatus(e.target.value); setEditing(true) }}
          >
            {[{ value: 'PENDING', label: 'Pending' }, { value: 'VERIFIED', label: 'Verified' }, { value: 'MISSING', label: 'Missing' }, { value: 'DAMAGED', label: 'Damaged' }].map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </td>
      <td>
        {isLocked ? (
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{notes || '—'}</span>
        ) : (
          <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
            <input
              className="form-input"
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              value={notes}
              onChange={e => { setNotes(e.target.value); setEditing(true) }}
              placeholder="Notes..."
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
