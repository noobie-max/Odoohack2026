'use client'

import { useState, useTransition } from 'react'
import {
  allocateAsset, returnAsset, requestTransfer,
  approveTransfer, rejectTransfer
} from '@/lib/actions/allocations'
import { getAssets } from '@/lib/actions/assets'
import {
  AlertTriangle, CheckCircle, ArrowLeftRight, RotateCcw, Plus, X, Package
} from 'lucide-react'
import { allocationStatusColors, transferStatusColors, formatDate, assetStatusColors } from '@/lib/utils'

export function AllocationsClient({
  allocations, pendingTransfers, availableAssets, users, userRole, userId
}: any) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' }>({ text: '', type: 'success' })
  const [activeTab, setActiveTab] = useState<'allocations' | 'transfers'>('allocations')

  // Allocate form
  const [showAllocate, setShowAllocate] = useState(false)
  const [allocForm, setAllocForm] = useState({ assetId: '', employeeId: '', expectedReturnDate: '' })
  const [allAssets, setAllAssets] = useState<any[]>([])
  const [conflictInfo, setConflictInfo] = useState<any>(null)

  // Return form
  const [returningId, setReturningId] = useState<string | null>(null)
  const [returnNotes, setReturnNotes] = useState('')

  // Transfer form
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferForm, setTransferForm] = useState({ assetId: '', toEmployeeId: '', reason: '' })

  const canManage = userRole === 'ASSET_MANAGER' || userRole === 'ADMIN'
  const canApprove = userRole === 'DEPARTMENT_HEAD' || userRole === 'ASSET_MANAGER' || userRole === 'ADMIN'

  function showMsg(text: string, type: 'success' | 'error' | 'warning' = 'success') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: 'success' }), 4000)
  }

  async function handleAllocate() {
    setConflictInfo(null)
    startTransition(async () => {
      const result = await allocateAsset({
        assetId: allocForm.assetId,
        employeeId: allocForm.employeeId,
        expectedReturnDate: allocForm.expectedReturnDate || undefined,
      })

      if ((result as any).blocked) {
        // §4.2: Double-allocation blocked — show conflict and offer transfer
        setConflictInfo(result)
        showMsg((result as any).error, 'warning')
        return
      }

      if (result.error) {
        showMsg(result.error, 'error')
        return
      }

      showMsg('Asset allocated successfully!')
      setShowAllocate(false)
      setAllocForm({ assetId: '', employeeId: '', expectedReturnDate: '' })
    })
  }

  function handleReturn(allocationId: string) {
    startTransition(async () => {
      const result = await returnAsset({ allocationId, returnConditionNotes: returnNotes })
      if (result.error) { showMsg(result.error, 'error'); return }
      showMsg('Asset returned successfully!')
      setReturningId(null)
      setReturnNotes('')
    })
  }

  function handleTransferRequest() {
    startTransition(async () => {
      const result = await requestTransfer({
        assetId: transferForm.assetId,
        toEmployeeId: transferForm.toEmployeeId,
        reason: transferForm.reason || undefined,
      })
      if (result.error) { showMsg(result.error, 'error'); return }
      showMsg('Transfer request submitted!')
      setShowTransfer(false)
      setTransferForm({ assetId: '', toEmployeeId: '', reason: '' })
    })
  }

  function handleApproveTransfer(id: string) {
    startTransition(async () => {
      const result = await approveTransfer(id)
      if (result.error) { showMsg(result.error, 'error'); return }
      showMsg('Transfer approved!')
    })
  }

  function handleRejectTransfer(id: string) {
    startTransition(async () => {
      const result = await rejectTransfer(id)
      if (result.error) { showMsg(result.error, 'error'); return }
      showMsg('Transfer rejected.')
    })
  }

  // Pre-fill transfer from conflict
  function handleConflictTransfer() {
    setTransferForm({
      assetId: allocForm.assetId,
      toEmployeeId: allocForm.employeeId,
      reason: 'Transfer requested after allocation attempt',
    })
    setConflictInfo(null)
    setShowAllocate(false)
    setShowTransfer(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Allocation & Transfer</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>Manage asset assignments and transfer requests</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setShowAllocate(true)}>
              <Plus size={16} /> Allocate Asset
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowTransfer(true)}>
            <ArrowLeftRight size={16} /> Request Transfer
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div style={{
          background: message.type === 'error' ? '#fef2f2' : message.type === 'warning' ? '#fffbeb' : '#f0fdf4',
          border: '1px solid',
          borderColor: message.type === 'error' ? '#fecaca' : message.type === 'warning' ? '#fde68a' : '#bbf7d0',
          color: message.type === 'error' ? '#991b1b' : message.type === 'warning' ? '#92400e' : '#166534',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {message.type === 'warning' && <AlertTriangle size={16} />}
          {message.type === 'success' && <CheckCircle size={16} />}
          {message.text}
          {conflictInfo && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={handleConflictTransfer}
            >
              <ArrowLeftRight size={14} /> Submit Transfer Request
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tabs-list">
          <button className={`tab-trigger ${activeTab === 'allocations' ? 'active' : ''}`} onClick={() => setActiveTab('allocations')}>
            Active Allocations ({allocations.length})
          </button>
          <button className={`tab-trigger ${activeTab === 'transfers' ? 'active' : ''}`} onClick={() => setActiveTab('transfers')}>
            Pending Transfers ({pendingTransfers.length})
          </button>
        </div>

        <div style={{ padding: '1rem' }}>
          {activeTab === 'allocations' && (
            <table className="data-table">
              <thead>
                <tr><th>Asset</th><th>Employee</th><th>Department</th><th>Allocated</th><th>Expected Return</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {allocations.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state">No active allocations</div></td></tr>
                ) : allocations.map((alloc: any) => (
                  <tr key={alloc.id}>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }}>{alloc.asset.tag}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{alloc.asset.name}</div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{alloc.employee.name}</td>
                    <td style={{ color: '#64748b' }}>{alloc.employee.department?.name || '—'}</td>
                    <td style={{ color: '#64748b' }}>{formatDate(alloc.allocatedDate)}</td>
                    <td>
                      {alloc.expectedReturnDate
                        ? <span style={{ color: new Date(alloc.expectedReturnDate) < new Date() ? '#ef4444' : '#64748b' }}>{formatDate(alloc.expectedReturnDate)}</span>
                        : <span style={{ color: '#94a3b8' }}>—</span>}
                    </td>
                    <td>
                      <span className={`badge ${allocationStatusColors[alloc.status] || ''}`}>{alloc.status}</span>
                    </td>
                    <td>
                      {canManage && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setReturningId(alloc.id)}>
                          <RotateCcw size={12} /> Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'transfers' && (
            <table className="data-table">
              <thead>
                <tr><th>Asset</th><th>From</th><th>To</th><th>Reason</th><th>Requested</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pendingTransfers.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state">No pending transfers</div></td></tr>
                ) : pendingTransfers.map((t: any) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }}>{t.asset.tag}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.asset.name}</div>
                    </td>
                    <td>{t.fromEmployee.name}<br /><span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t.fromEmployee.department?.name}</span></td>
                    <td>{t.toEmployee.name}<br /><span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t.toEmployee.department?.name}</span></td>
                    <td style={{ color: '#64748b', fontSize: '0.8rem', maxWidth: 150 }}>{t.reason || '—'}</td>
                    <td style={{ color: '#64748b' }}>{formatDate(t.requestedAt)}</td>
                    <td><span className={`badge ${transferStatusColors[t.status] || ''}`}>{t.status}</span></td>
                    <td>
                      {canApprove && t.status === 'REQUESTED' && (
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleApproveTransfer(t.id)}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleRejectTransfer(t.id)}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Allocate Modal */}
      {showAllocate && canManage && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowAllocate(false) }}>
          <div className="dialog">
            <h2 className="dialog-title">Allocate Asset to Employee</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Select Asset *</label>
                <select className="form-select" value={allocForm.assetId} onChange={e => setAllocForm(f => ({ ...f, assetId: e.target.value }))}>
                  <option value="">— Select asset —</option>
                  {availableAssets.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.tag} — {a.name} ({a.status.replace(/_/g, ' ')})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Select Employee *</label>
                <select className="form-select" value={allocForm.employeeId} onChange={e => setAllocForm(f => ({ ...f, employeeId: e.target.value }))}>
                  <option value="">— Select employee —</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.department?.name || 'No Dept'})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Expected Return Date</label>
                <input type="date" className="form-input" value={allocForm.expectedReturnDate}
                  onChange={e => setAllocForm(f => ({ ...f, expectedReturnDate: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAllocate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAllocate}
                disabled={!allocForm.assetId || !allocForm.employeeId || isPending}>
                {isPending ? 'Allocating...' : 'Allocate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Request Modal */}
      {showTransfer && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowTransfer(false) }}>
          <div className="dialog">
            <h2 className="dialog-title">Request Asset Transfer</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Asset *</label>
                <select className="form-select" value={transferForm.assetId} onChange={e => setTransferForm(f => ({ ...f, assetId: e.target.value }))}>
                  <option value="">— Select asset —</option>
                  {[...availableAssets, ...allocations.map((a: any) => a.asset)].filter((v, i, arr) =>
                    arr.findIndex((x: any) => x.id === v.id) === i
                  ).map((a: any) => (
                    <option key={a.id} value={a.id}>{a.tag} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Transfer To Employee *</label>
                <select className="form-select" value={transferForm.toEmployeeId} onChange={e => setTransferForm(f => ({ ...f, toEmployeeId: e.target.value }))}>
                  <option value="">— Select employee —</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.department?.name || 'No Dept'})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea className="form-textarea" rows={3} value={transferForm.reason}
                  onChange={e => setTransferForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Why is this transfer needed?" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowTransfer(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleTransferRequest}
                disabled={!transferForm.assetId || !transferForm.toEmployeeId || isPending}>
                {isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returningId && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setReturningId(null) }}>
          <div className="dialog">
            <h2 className="dialog-title">Return Asset</h2>
            <div className="form-group">
              <label className="form-label">Condition Notes</label>
              <textarea className="form-textarea" rows={3} value={returnNotes}
                onChange={e => setReturnNotes(e.target.value)}
                placeholder="Describe the condition of the asset on return..." />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setReturningId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleReturn(returningId)} disabled={isPending}>
                {isPending ? 'Processing...' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
