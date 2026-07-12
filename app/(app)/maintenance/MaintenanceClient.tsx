'use client'

import { useState, useTransition } from 'react'
import {
  raiseMaintenanceRequest, approveMaintenanceRequest,
  rejectMaintenanceRequest, assignTechnician,
  startMaintenanceProgress, resolveMaintenanceRequest
} from '@/lib/actions/maintenance'
import {
  Wrench, Plus, AlertTriangle, CheckCircle2, AlertCircle,
  Info, X, XCircle, Image as ImageIcon
} from 'lucide-react'
import { priorityColors, formatDate, timeAgo } from '@/lib/utils'

const KANBAN_COLUMNS = [
  { key: 'PENDING', label: 'Pending', accent: '#d97706' },
  { key: 'APPROVED', label: 'Approved', accent: '#4f46e5' },
  { key: 'TECHNICIAN_ASSIGNED', label: 'Tech Assigned', accent: '#7c3aed' },
  { key: 'IN_PROGRESS', label: 'In Progress', accent: '#ea580c' },
  { key: 'RESOLVED', label: 'Resolved', accent: '#059669' },
]

const PRIORITY_STRIPE: Record<string, string> = {
  LOW: '#94a3b8',
  MEDIUM: '#4f46e5',
  HIGH: '#d97706',
  CRITICAL: '#e11d48',
}

const NEXT_STEP: Record<string, { action: string; label: string }> = {
  PENDING: { action: 'approve', label: 'Approve' },
  APPROVED: { action: 'assign', label: 'Assign Tech' },
  TECHNICIAN_ASSIGNED: { action: 'start', label: 'Start Progress' },
  IN_PROGRESS: { action: 'resolve', label: 'Mark Resolved' },
}

export function MaintenanceClient({ requests, assets, userRole, userId }: any) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [showRaise, setShowRaise] = useState(false)
  const [showAssign, setShowAssign] = useState<string | null>(null)
  const [techName, setTechName] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [form, setForm] = useState({
    assetId: '', issueDescription: '', priority: 'MEDIUM', photoUrl: '',
  })

  const canApprove = userRole === 'ASSET_MANAGER' || userRole === 'ADMIN'

  function showMsg(text: string) {
    setMessage(text)
    setTimeout(() => setMessage(''), 3500)
  }

  function handleRaise() {
    startTransition(async () => {
      const payload: any = {
        assetId: form.assetId,
        issueDescription: form.issueDescription,
        priority: form.priority,
      }
      if (form.photoUrl.trim()) payload.photoUrl = form.photoUrl.trim()
      const result = await raiseMaintenanceRequest(payload)
      if (result.error) { showMsg('Error: ' + result.error); return }
      showMsg('Maintenance request raised!')
      setShowRaise(false)
      setForm({ assetId: '', issueDescription: '', priority: 'MEDIUM', photoUrl: '' })
    })
  }

  function handleAdvance(req: any) {
    if (req.status === 'APPROVED') {
      setShowAssign(req.id)
      return
    }
    startTransition(async () => {
      let result: any
      if (req.status === 'PENDING') result = await approveMaintenanceRequest(req.id)
      else if (req.status === 'TECHNICIAN_ASSIGNED') result = await startMaintenanceProgress(req.id)
      else if (req.status === 'IN_PROGRESS') result = await resolveMaintenanceRequest(req.id)
      if (result?.error) showMsg('Error: ' + result.error)
      else showMsg('Status updated!')
    })
  }

  function handleReject(reqId: string) {
    startTransition(async () => {
      const result = await rejectMaintenanceRequest(reqId)
      if (result.error) showMsg('Error: ' + result.error)
      else showMsg('Request rejected.')
    })
  }

  function handleAssignTech() {
    if (!showAssign || !techName) return
    startTransition(async () => {
      const result = await assignTechnician(showAssign, techName)
      if (result.error) { showMsg('Error: ' + result.error); return }
      showMsg('Technician assigned!')
      setShowAssign(null)
      setTechName('')
    })
  }

  const byStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.key] = requests.filter((r: any) => r.status === col.key)
    return acc
  }, {} as Record<string, any[]>)

  const rejectedRequests = requests.filter((r: any) => r.status === 'REJECTED')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Maintenance Management</h1>
          <p className="page-subtitle">Approval-first repair workflow — from request to resolution.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowRaise(true)}>
          <Plus size={16} /> Raise Request
        </button>
      </div>

      {message && (
        <div className={`inline-alert ${message.startsWith('Error') ? 'error' : 'success'}`}>
          {message.startsWith('Error')
            ? <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            : <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />}
          {message}
        </div>
      )}

      <div className="inline-alert info">
        <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Approving a request moves the asset to <strong>Under Maintenance</strong>. Resolving returns it to <strong>Available</strong>. Rejecting does not change asset status.
        </span>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {KANBAN_COLUMNS.map(col => (
          <div key={col.key} className="kanban-col" style={{ ['--kanban-accent' as string]: col.accent }}>
            <div className="kanban-col-title">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--kanban-accent)', flexShrink: 0 }} />
                {col.label}
              </span>
              <span className="kanban-count">{byStatus[col.key]?.length || 0}</span>
            </div>

            {byStatus[col.key]?.map((req: any) => (
              <div key={req.id} className="kanban-card" onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}>
                <div className="priority-stripe" style={{ background: PRIORITY_STRIPE[req.priority] || 'var(--border-strong)' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.45rem' }}>
                  <span className="badge no-dot" style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', borderColor: 'var(--brand-200)', fontVariantNumeric: 'tabular-nums' }}>
                    {req.asset?.tag}
                  </span>
                  <span className={`badge ${priorityColors[req.priority]}`}>{req.priority}</span>
                </div>
                <div style={{ fontSize: '0.83rem', fontWeight: 650, color: 'var(--text-1)', lineHeight: 1.35, marginBottom: '0.3rem' }}>
                  {req.asset?.name}
                </div>
                <div style={{
                  fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.45, marginBottom: '0.5rem',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {req.issueDescription}
                </div>
                {req.technicianName && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--violet)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
                    <Wrench size={11} /> {req.technicianName}
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="truncate" style={{ flex: 1 }}>
                    by {req.raisedBy?.name} · {timeAgo(req.createdAt)}
                  </span>
                  {req.photoUrl && (
                    <span title="Photo attached" style={{ display: 'inline-flex', color: 'var(--info)', flexShrink: 0 }}>
                      <ImageIcon size={12} />
                    </span>
                  )}
                </div>

                {expandedId === req.id && req.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={req.photoUrl}
                    alt="Issue photo"
                    style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)', marginTop: '0.55rem' }}
                  />
                )}

                {expandedId === req.id && canApprove && NEXT_STEP[req.status] && (
                  <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={e => { e.stopPropagation(); handleAdvance(req) }}
                      disabled={isPending}
                    >
                      {NEXT_STEP[req.status].label}
                    </button>
                    {req.status === 'PENDING' && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={e => { e.stopPropagation(); handleReject(req.id) }}
                        disabled={isPending}
                      >
                        Reject
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {byStatus[col.key]?.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '1.6rem 0.5rem', color: 'var(--text-3)', fontSize: '0.75rem',
                border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)',
              }}>
                No requests
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rejected section */}
      {rejectedRequests.length > 0 && (
        <div>
          <div className="section-header" style={{ marginBottom: '0.75rem' }}>
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <XCircle size={16} style={{ color: 'var(--danger)' }} /> Rejected Requests
              <span className="badge no-dot" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}>
                {rejectedRequests.length}
              </span>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Asset</th><th>Issue</th><th>Priority</th><th>Raised By</th><th>Date</th></tr></thead>
              <tbody>
                {rejectedRequests.map((req: any) => (
                  <tr key={req.id}>
                    <td>
                      <span className="badge no-dot" style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', borderColor: 'var(--brand-200)', fontVariantNumeric: 'tabular-nums' }}>
                        {req.asset?.tag}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: '0.8rem', maxWidth: 380 }}>{req.issueDescription}</td>
                    <td><span className={`badge ${priorityColors[req.priority]}`}>{req.priority}</span></td>
                    <td>{req.raisedBy?.name}</td>
                    <td style={{ color: 'var(--text-2)' }}>{formatDate(req.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raise Request Modal */}
      {showRaise && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowRaise(false) }}>
          <div className="dialog">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <h2 className="dialog-title">Raise Maintenance Request</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowRaise(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Asset *</label>
                <select className="form-select" value={form.assetId} onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))}>
                  <option value="">— Select asset —</option>
                  {assets.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.tag} — {a.name} ({a.status.replace(/_/g, ' ')})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Issue Description *</label>
                <textarea className="form-textarea" rows={4} value={form.issueDescription}
                  onChange={e => setForm(f => ({ ...f, issueDescription: e.target.value }))}
                  placeholder="Describe the issue in detail (min 10 characters)..." />
              </div>
              <div className="form-group">
                <label className="form-label">Photo URL</label>
                <input className="form-input" type="url" value={form.photoUrl}
                  onChange={e => setForm(f => ({ ...f, photoUrl: e.target.value }))}
                  placeholder="https://..." />
                <span className="form-hint">Optional — link a photo showing the issue.</span>
              </div>
            </div>
            <div className="inline-alert warning" style={{ marginTop: '0.9rem' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Raising this request will <strong>not</strong> change the asset&apos;s status. The Asset Manager must approve it first, which moves the asset to Under Maintenance.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowRaise(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRaise}
                disabled={!form.assetId || form.issueDescription.length < 10 || isPending}>
                {isPending && <span className="spinner" style={{ width: 14, height: 14 }} />}
                {isPending ? 'Submitting...' : 'Raise Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Technician Modal */}
      {showAssign && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowAssign(null) }}>
          <div className="dialog" style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <h2 className="dialog-title">Assign Technician</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAssign(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Technician Name *</label>
              <input className="form-input" value={techName} onChange={e => setTechName(e.target.value)} placeholder="e.g. John Doe" />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAssign(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssignTech} disabled={!techName || isPending}>
                {isPending ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
