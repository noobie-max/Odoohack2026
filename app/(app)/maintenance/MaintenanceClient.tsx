'use client'

import { useState, useTransition } from 'react'
import {
  raiseMaintenanceRequest, approveMaintenanceRequest,
  rejectMaintenanceRequest, assignTechnician,
  startMaintenanceProgress, resolveMaintenanceRequest
} from '@/lib/actions/maintenance'
import { Wrench, Plus, ChevronRight, AlertTriangle } from 'lucide-react'
import { maintenanceStatusColors, priorityColors, formatDate, assetStatusColors } from '@/lib/utils'

const KANBAN_COLUMNS = [
  { key: 'PENDING', label: 'Pending', color: '#f59e0b', bg: '#fffbeb' },
  { key: 'APPROVED', label: 'Approved', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'TECHNICIAN_ASSIGNED', label: 'Tech Assigned', color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: '#f97316', bg: '#fff7ed' },
  { key: 'RESOLVED', label: 'Resolved', color: '#22c55e', bg: '#f0fdf4' },
]

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
    assetId: '', issueDescription: '', priority: 'MEDIUM',
  })

  const canApprove = userRole === 'ASSET_MANAGER' || userRole === 'ADMIN'

  function showMsg(text: string) {
    setMessage(text)
    setTimeout(() => setMessage(''), 3500)
  }

  function handleRaise() {
    startTransition(async () => {
      const result = await raiseMaintenanceRequest({
        assetId: form.assetId,
        issueDescription: form.issueDescription,
        priority: form.priority as any,
      })
      if (result.error) { showMsg('Error: ' + result.error); return }
      showMsg('Maintenance request raised!')
      setShowRaise(false)
      setForm({ assetId: '', issueDescription: '', priority: 'MEDIUM' })
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Maintenance Management</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>Route and track maintenance through an approval workflow</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowRaise(true)}>
          <Plus size={16} /> Raise Request
        </button>
      </div>

      {message && (
        <div style={{ background: message.startsWith('Error') ? '#fef2f2' : '#f0fdf4', border: '1px solid', borderColor: message.startsWith('Error') ? '#fecaca' : '#bbf7d0', color: message.startsWith('Error') ? '#991b1b' : '#166534', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
          {message}
        </div>
      )}

      {/* Status note */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.625rem 1rem', fontSize: '0.8rem', color: '#64748b' }}>
        ℹ Approving a request moves the asset to <strong>Under Maintenance</strong>. Resolving returns it to <strong>Available</strong>. Rejecting does not change asset status.
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {KANBAN_COLUMNS.map(col => (
          <div key={col.key} className="kanban-col">
            <div className="kanban-col-title">
              <span style={{ color: col.color }}>{col.label}</span>
              <span style={{ background: col.bg, color: col.color, borderRadius: '9999px', padding: '0 0.375rem', fontSize: '0.7rem' }}>
                {byStatus[col.key]?.length || 0}
              </span>
            </div>

            {byStatus[col.key]?.map((req: any) => (
              <div key={req.id} className="kanban-card" onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', background: '#f1f5f9', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>
                    {req.asset?.tag}
                  </span>
                  <span className={`badge ${priorityColors[req.priority]}`}>{req.priority}</span>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#0f172a', marginBottom: '0.25rem' }}>
                  {req.asset?.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  {req.issueDescription.length > 60 ? req.issueDescription.substring(0, 60) + '...' : req.issueDescription}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  by {req.raisedBy?.name} • {formatDate(req.createdAt)}
                </div>
                {req.technicianName && (
                  <div style={{ fontSize: '0.7rem', color: '#7c3aed' }}>Tech: {req.technicianName}</div>
                )}

                {expandedId === req.id && canApprove && NEXT_STEP[req.status] && (
                  <div style={{ marginTop: '0.625rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
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
              <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#cbd5e1', fontSize: '0.8rem' }}>Empty</div>
            )}
          </div>
        ))}
      </div>

      {/* Rejected section */}
      {rejectedRequests.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: '0.75rem', color: '#ef4444' }}>Rejected ({rejectedRequests.length})</div>
          <table className="data-table">
            <thead><tr><th>Asset</th><th>Issue</th><th>Priority</th><th>Raised By</th><th>Date</th></tr></thead>
            <tbody>
              {rejectedRequests.map((req: any) => (
                <tr key={req.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{req.asset?.tag}</td>
                  <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{req.issueDescription}</td>
                  <td><span className={`badge ${priorityColors[req.priority]}`}>{req.priority}</span></td>
                  <td>{req.raisedBy?.name}</td>
                  <td style={{ color: '#64748b' }}>{formatDate(req.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Raise Request Modal */}
      {showRaise && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowRaise(false) }}>
          <div className="dialog">
            <h2 className="dialog-title">Raise Maintenance Request</h2>
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
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.375rem', padding: '0.625rem', fontSize: '0.75rem', color: '#92400e', marginTop: '0.75rem' }}>
              ⚠ Raising this request will NOT change the asset's status. The Asset Manager must approve it first, which moves the asset to Under Maintenance.
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowRaise(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRaise}
                disabled={!form.assetId || form.issueDescription.length < 10 || isPending}>
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
            <h2 className="dialog-title">Assign Technician</h2>
            <div className="form-group">
              <label className="form-label">Technician Name *</label>
              <input className="form-input" value={techName} onChange={e => setTechName(e.target.value)} placeholder="e.g. John Doe" />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAssign(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssignTech} disabled={!techName || isPending}>
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
