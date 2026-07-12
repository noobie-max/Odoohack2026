'use client'

import { useState, useTransition } from 'react'
import {
  allocateAsset, returnAsset, requestTransfer,
  approveTransfer, rejectTransfer
} from '@/lib/actions/allocations'
import {
  AlertTriangle, AlertCircle, CheckCircle2, ArrowLeftRight, ArrowRight,
  RotateCcw, Plus, X, Package
} from 'lucide-react'
import { allocationStatusColors, transferStatusColors, formatDate } from '@/lib/utils'

function initialsOf(name?: string | null) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function MiniAvatar({ name, size = 26 }: { name?: string | null; size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size, boxShadow: 'none', fontSize: size <= 24 ? '0.56rem' : '0.62rem' }}>
      {initialsOf(name)}
    </div>
  )
}

function AssetTag({ tag }: { tag: string }) {
  return (
    <span className="badge no-dot" style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', borderColor: 'var(--brand-200)', fontVariantNumeric: 'tabular-nums' }}>
      {tag}
    </span>
  )
}

export function AllocationsClient({
  allocations, pendingTransfers, availableAssets, users, userRole, userId
}: any) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' }>({ text: '', type: 'success' })
  const [activeTab, setActiveTab] = useState<'allocations' | 'transfers'>('allocations')

  // Allocate form
  const [showAllocate, setShowAllocate] = useState(false)
  const [allocForm, setAllocForm] = useState({ assetId: '', employeeId: '', expectedReturnDate: '' })
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

  function closeAllocate() {
    setShowAllocate(false)
    setConflictInfo(null)
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
        setTransferForm({
          assetId: allocForm.assetId,
          toEmployeeId: allocForm.employeeId,
          reason: '',
        })
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
      setShowAllocate(false)
      setConflictInfo(null)
      setTransferForm({ assetId: '', toEmployeeId: '', reason: '' })
      setAllocForm({ assetId: '', employeeId: '', expectedReturnDate: '' })
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

  const holder = conflictInfo?.currentHolder
  const holderName = holder?.name || 'Unknown'
  const holderDept = holder?.department?.name || 'Unknown Department'
  const conflictAsset = availableAssets.find((a: any) => a.id === allocForm.assetId)

  const now = new Date()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Allocation &amp; Transfer</h1>
          <p className="page-subtitle">Assign assets, resolve conflicts, and manage returns.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setShowAllocate(true)}>
              <Plus size={16} /> Allocate Asset
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowTransfer(true)}>
            <ArrowLeftRight size={15} /> Request Transfer
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`inline-alert ${message.type}`}>
          {message.type === 'error' && <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />}
          {message.type === 'warning' && <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />}
          {message.type === 'success' && <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 2 }} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="tabs-list">
          <button className={`tab-trigger ${activeTab === 'allocations' ? 'active' : ''}`} onClick={() => setActiveTab('allocations')}>
            Active Allocations ({allocations.length})
          </button>
          <button className={`tab-trigger ${activeTab === 'transfers' ? 'active' : ''}`} onClick={() => setActiveTab('transfers')}>
            Pending Transfers ({pendingTransfers.length})
          </button>
        </div>

        {activeTab === 'allocations' && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Asset</th><th>Employee</th><th>Department</th><th>Allocated</th><th>Expected Return</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {allocations.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><Package size={28} />No active allocations</div></td></tr>
                ) : allocations.map((alloc: any) => {
                  const due = alloc.expectedReturnDate ? new Date(alloc.expectedReturnDate) : null
                  const overdue = alloc.status === 'OVERDUE' || (!!due && due < now)
                  const daysLate = overdue && due
                    ? Math.max(1, Math.floor((now.getTime() - due.getTime()) / 86400000))
                    : 0
                  return (
                    <tr key={alloc.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                          <AssetTag tag={alloc.asset.tag} />
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{alloc.asset.name}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          <MiniAvatar name={alloc.employee.name} />
                          <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{alloc.employee.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-2)' }}>{alloc.employee.department?.name || '—'}</td>
                      <td style={{ color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{formatDate(alloc.allocatedDate)}</td>
                      <td style={overdue ? { background: 'var(--danger-bg)' } : undefined}>
                        {due ? (
                          <>
                            <div style={{ color: overdue ? 'var(--danger)' : 'var(--text-2)', fontWeight: overdue ? 650 : 400, fontVariantNumeric: 'tabular-nums' }}>
                              {formatDate(alloc.expectedReturnDate)}
                            </div>
                            {overdue && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600, marginTop: '0.1rem' }}>
                                {daysLate} day{daysLate !== 1 ? 's' : ''} late
                              </div>
                            )}
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-3)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${allocationStatusColors[alloc.status] || ''}`}>{alloc.status}</span>
                      </td>
                      <td>
                        {canManage && (
                          <button className="btn btn-secondary btn-sm" onClick={() => setReturningId(alloc.id)}>
                            <RotateCcw size={12} /> Return
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'transfers' && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Asset</th><th>From → To</th><th>Reason</th><th>Requested</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pendingTransfers.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><ArrowLeftRight size={28} />No pending transfers</div></td></tr>
                ) : pendingTransfers.map((t: any) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                        <AssetTag tag={t.asset.tag} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{t.asset.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                          <MiniAvatar name={t.fromEmployee.name} size={24} />
                          <div style={{ minWidth: 0 }}>
                            <div className="truncate" style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-1)' }}>{t.fromEmployee.name}</div>
                            <div className="truncate" style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{t.fromEmployee.department?.name || '—'}</div>
                          </div>
                        </div>
                        <ArrowRight size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                          <MiniAvatar name={t.toEmployee.name} size={24} />
                          <div style={{ minWidth: 0 }}>
                            <div className="truncate" style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-1)' }}>{t.toEmployee.name}</div>
                            <div className="truncate" style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{t.toEmployee.department?.name || '—'}</div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: '0.8rem', maxWidth: 180 }}>{t.reason || '—'}</td>
                    <td style={{ color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{formatDate(t.requestedAt)}</td>
                    <td><span className={`badge ${transferStatusColors[t.status] || ''}`}>{t.status}</span></td>
                    <td>
                      {canApprove && t.status === 'REQUESTED' && (
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button className="btn btn-success btn-sm" onClick={() => handleApproveTransfer(t.id)}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleRejectTransfer(t.id)}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Allocate Modal */}
      {showAllocate && canManage && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) closeAllocate() }}>
          <div className="dialog">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
              <h2 className="dialog-title" style={{ marginBottom: 0 }}>Allocate Asset to Employee</h2>
              <button className="btn btn-ghost btn-sm" onClick={closeAllocate} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {conflictInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {conflictAsset && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <AssetTag tag={conflictAsset.tag} />
                    <span style={{ fontWeight: 650, fontSize: '0.875rem', color: 'var(--text-1)' }}>{conflictAsset.name}</span>
                  </div>
                )}

                <div className="inline-alert error">
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      Already allocated to {holderName} ({holderDept})
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Direct re-allocation is blocked — submit a transfer request instead.
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)' }}>
                  Transfer Request
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                  <div className="form-group">
                    <label className="form-label">From</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.4rem 0.65rem', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}>
                      <MiniAvatar name={holderName} />
                      <div style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-1)' }}>{holderName}</div>
                        <div className="truncate" style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{holderDept}</div>
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">To *</label>
                    <select className="form-select" value={transferForm.toEmployeeId} onChange={e => setTransferForm(f => ({ ...f, toEmployeeId: e.target.value }))}>
                      <option value="">— Select employee —</option>
                      {users.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.department?.name || 'No Dept'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <textarea className="form-textarea" rows={3} value={transferForm.reason}
                    onChange={e => setTransferForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="Why should this asset move to a new holder?" />
                  <span className="form-hint">The current holder and asset managers will be notified.</span>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={closeAllocate}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleTransferRequest}
                    disabled={!transferForm.toEmployeeId || isPending}>
                    <ArrowLeftRight size={15} /> {isPending ? 'Submitting...' : 'Submit Transfer Request'}
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                    <span className="form-hint">Leave empty for open-ended allocations.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={closeAllocate}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleAllocate}
                    disabled={!allocForm.assetId || !allocForm.employeeId || isPending}>
                    {isPending ? 'Allocating...' : 'Allocate'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Transfer Request Modal */}
      {showTransfer && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowTransfer(false) }}>
          <div className="dialog">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
              <h2 className="dialog-title" style={{ marginBottom: 0 }}>Request Asset Transfer</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowTransfer(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Asset *</label>
                <select className="form-select" value={transferForm.assetId} onChange={e => setTransferForm(f => ({ ...f, assetId: e.target.value }))}>
                  <option value="">— Select asset —</option>
                  {[...availableAssets.filter((a: any) => a.status === 'ALLOCATED'), ...allocations.map((a: any) => a.asset)].filter((v, i, arr) =>
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
                <span className="form-hint">Transfers require approval before the asset changes hands.</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
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
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
              <h2 className="dialog-title" style={{ marginBottom: 0 }}>Return Asset</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setReturningId(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Condition Notes</label>
              <textarea className="form-textarea" rows={3} value={returnNotes}
                onChange={e => setReturnNotes(e.target.value)}
                placeholder="Describe the condition of the asset on return..." />
              <span className="form-hint">Notes are saved to the allocation history and visible to asset managers.</span>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setReturningId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleReturn(returningId)} disabled={isPending}>
                <RotateCcw size={14} /> {isPending ? 'Processing...' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
