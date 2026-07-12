'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { registerAsset, setAssetStatus } from '@/lib/actions/assets'
import {
  Plus, Search, X, ChevronRight, CheckCircle2, AlertCircle, PackageSearch,
  User, Wrench, Archive, Trash2, AlertTriangle, RotateCcw
} from 'lucide-react'
import { assetStatusColors, allocationStatusColors, maintenanceStatusColors, formatDate } from '@/lib/utils'

const STATUS_OPTIONS = ['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED']

const tagChipStyle = {
  background: 'var(--brand-50)',
  color: 'var(--brand-700)',
  borderColor: 'var(--brand-200)',
  fontVariantNumeric: 'tabular-nums',
} as const

const detailLabelStyle = {
  fontSize: '0.68rem',
  color: 'var(--text-3)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.15rem',
} as const

const drawerSectionLabelStyle = {
  fontSize: '0.72rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-3)',
  margin: '1.25rem 0 0.6rem',
} as const

export function AssetsClient({ assets, categories, departments, userRole }: any) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    name: '', categoryId: '', serialNumber: '', acquisitionDate: '',
    acquisitionCost: '', condition: '', location: '', isBookable: false, departmentId: '', photoUrl: ''
  })
  const [customValues, setCustomValues] = useState<Record<string, string>>({})

  const canRegister = userRole === 'ASSET_MANAGER' || userRole === 'ADMIN'

  const selectedCategory = categories.find((c: any) => c.id === form.categoryId)
  const customFieldDefs: [string, string][] =
    selectedCategory?.customFields && typeof selectedCategory.customFields === 'object' && !Array.isArray(selectedCategory.customFields)
      ? Object.entries(selectedCategory.customFields).map(([k, v]) => [k, String(v ?? '')])
      : []

  const filtered = assets.filter((a: any) => {
    const q = search.toLowerCase()
    const matchSearch = !q || a.tag.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || (a.serialNumber || '').toLowerCase().includes(q)
    const matchCat = !filterCategory || a.categoryId === filterCategory
    const matchStatus = !filterStatus || a.status === filterStatus
    const matchDept = !filterDept || a.departmentId === filterDept
    return matchSearch && matchCat && matchStatus && matchDept
  })

  function handleRegister() {
    startTransition(async () => {
      const enteredCustom: Record<string, string> = {}
      for (const [key, value] of Object.entries(customValues)) {
        if (value.trim()) enteredCustom[key] = value.trim()
      }
      const result = await registerAsset({
        name: form.name,
        categoryId: form.categoryId,
        serialNumber: form.serialNumber || undefined,
        acquisitionDate: form.acquisitionDate || undefined,
        acquisitionCost: form.acquisitionCost ? parseFloat(form.acquisitionCost) : undefined,
        condition: form.condition || undefined,
        location: form.location || undefined,
        isBookable: form.isBookable,
        departmentId: form.departmentId || undefined,
        photoUrl: form.photoUrl.trim() || undefined,
        customFieldValues: Object.keys(enteredCustom).length > 0 ? enteredCustom : undefined,
      })
      if (result.error) { setMessage('Error: ' + result.error); return }
      setMessage('Asset registered: ' + (result.asset as any)?.tag)
      setShowRegister(false)
      setForm({ name: '', categoryId: '', serialNumber: '', acquisitionDate: '', acquisitionCost: '', condition: '', location: '', isBookable: false, departmentId: '', photoUrl: '' })
      setCustomValues({})
    })
  }

  function handleLifecycle(status: 'RETIRED' | 'DISPOSED' | 'LOST' | 'AVAILABLE', confirmText: string) {
    if (!selectedAsset) return
    if (!window.confirm(confirmText)) return
    startTransition(async () => {
      const result = await setAssetStatus(selectedAsset.id, status)
      if (result?.error) { setMessage('Error: ' + result.error); return }
      setMessage(`${selectedAsset.tag} — status updated to ${status.replace(/_/g, ' ').toLowerCase()}`)
      setSelectedAsset((prev: any) => (prev ? { ...prev, status } : prev))
      router.refresh()
    })
  }

  const drawerCustomFields =
    selectedAsset?.customFieldValues && typeof selectedAsset.customFieldValues === 'object' && !Array.isArray(selectedAsset.customFieldValues)
      ? Object.entries(selectedAsset.customFieldValues)
      : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      {/* Page Header */}
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Asset Directory</h1>
          <p className="page-subtitle">Register, search, and track every asset in the organization.</p>
        </div>
        {canRegister && (
          <button className="btn btn-primary" onClick={() => setShowRegister(true)}>
            <Plus size={16} /> Register Asset
          </button>
        )}
      </div>

      {message && (
        <div className={`inline-alert ${message.startsWith('Error') ? 'error' : 'success'}`}>
          {message.startsWith('Error')
            ? <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            : <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />}
          <span>{message}</span>
        </div>
      )}

      {/* Filters */}
      <div className="card filter-bar">
        <div className="searchbox">
          <Search size={15} />
          <input className="form-input" placeholder="Search by tag, name, or serial..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {(search || filterCategory || filterStatus || filterDept) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterCategory(''); setFilterStatus(''); setFilterDept('') }}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Tag</th><th>Name</th><th>Category</th><th>Status</th><th>Department</th><th>Location</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <PackageSearch size={28} />
                  No assets match your search or filters
                </div>
              </td></tr>
            ) : filtered.map((asset: any) => (
              <tr key={asset.id} className="row-click" onClick={() => setSelectedAsset(asset)}>
                <td>
                  <span className="badge no-dot" style={tagChipStyle}>{asset.tag}</span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{asset.name}</div>
                  {asset.allocations?.[0] && (
                    <div style={{ fontSize: '0.71rem', color: 'var(--text-3)', marginTop: 1 }}>
                      Held by: {asset.allocations[0].employee.name}
                    </div>
                  )}
                </td>
                <td style={{ color: 'var(--text-2)' }}>{asset.category?.name}</td>
                <td>
                  <span className={`badge ${assetStatusColors[asset.status] || ''}`}>{asset.status.replace(/_/g, ' ')}</span>
                </td>
                <td style={{ color: 'var(--text-2)' }}>{asset.department?.name || '—'}</td>
                <td style={{ color: 'var(--text-2)' }}>{asset.location || '—'}</td>
                <td><ChevronRight size={16} style={{ color: 'var(--text-3)' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      {selectedAsset && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedAsset(null)} />
          <div className="drawer">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ minWidth: 0 }}>
                <span className="badge no-dot" style={tagChipStyle}>{selectedAsset.tag}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.55rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.01em' }}>
                    {selectedAsset.name}
                  </h2>
                  <span className={`badge ${assetStatusColors[selectedAsset.status] || ''}`}>{selectedAsset.status.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedAsset(null)}><X size={16} /></button>
            </div>

            {selectedAsset.photoUrl && (
              <img
                src={selectedAsset.photoUrl}
                alt={selectedAsset.name}
                style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'block', marginBottom: '1.2rem' }}
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem 1rem' }}>
              {[
                ['Category', selectedAsset.category?.name],
                ['Status', selectedAsset.status.replace(/_/g, ' ')],
                ['Department', selectedAsset.department?.name || '—'],
                ['Location', selectedAsset.location || '—'],
                ['Serial #', selectedAsset.serialNumber || '—'],
                ['Condition', selectedAsset.condition || '—'],
                ['Acquisition Date', selectedAsset.acquisitionDate ? formatDate(selectedAsset.acquisitionDate) : '—'],
                ['Bookable', selectedAsset.isBookable ? 'Yes' : 'No'],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div style={detailLabelStyle}>{label}</div>
                  <div style={{ fontSize: '0.855rem', color: 'var(--text-1)' }}>{value}</div>
                </div>
              ))}
            </div>

            {drawerCustomFields.length > 0 && (
              <>
                <div style={drawerSectionLabelStyle}>Custom Fields</div>
                <div style={{
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: '#fafbfe',
                  padding: '0.85rem 0.95rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem 1rem',
                }}>
                  {drawerCustomFields.map(([key, value]) => (
                    <div key={key}>
                      <div style={detailLabelStyle}>{key}</div>
                      <div style={{ fontSize: '0.83rem', color: 'var(--text-1)' }}>{String(value)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={drawerSectionLabelStyle}>Allocation History</div>
            {selectedAsset.allocations?.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>No allocation history</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {selectedAsset.allocations?.map((alloc: any) => (
                  <div key={alloc.id} style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
                    <div className="icon-chip" style={{ width: 28, height: 28, borderRadius: 8, background: '#eef2ff' }}>
                      <User size={13} style={{ color: '#4f46e5' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>{alloc.employee?.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span>{formatDate(alloc.allocatedDate)} → {alloc.actualReturnDate ? formatDate(alloc.actualReturnDate) : 'Present'}</span>
                        <span className={`badge ${allocationStatusColors[alloc.status] || ''}`}>{alloc.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={drawerSectionLabelStyle}>Maintenance History</div>
            {selectedAsset.maintenance?.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>No maintenance history</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {selectedAsset.maintenance?.map((mr: any) => (
                  <div key={mr.id} style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
                    <div className="icon-chip" style={{ width: 28, height: 28, borderRadius: 8, background: '#fff7ed' }}>
                      <Wrench size={13} style={{ color: '#ea580c' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>{mr.issueDescription}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span>{formatDate(mr.createdAt)}</span>
                        <span className={`badge ${maintenanceStatusColors[mr.status] || ''}`}>{mr.status.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canRegister && (
              <div style={{
                marginTop: '1.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                background: '#fafbfe', padding: '0.9rem 1rem',
              }}>
                <div style={{ ...drawerSectionLabelStyle, margin: '0 0 0.65rem' }}>Lifecycle Actions</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {selectedAsset.status === 'AVAILABLE' && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={isPending}
                        onClick={() => handleLifecycle('RETIRED', `Retire ${selectedAsset.tag}? It will no longer be available for allocation.`)}
                      >
                        <Archive size={13} /> Retire
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={isPending}
                        onClick={() => handleLifecycle('DISPOSED', `Dispose of ${selectedAsset.tag} permanently? This cannot be undone.`)}
                      >
                        <Trash2 size={13} /> Dispose
                      </button>
                    </>
                  )}
                  {selectedAsset.status !== 'DISPOSED' && selectedAsset.status !== 'LOST' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={isPending}
                      onClick={() => handleLifecycle('LOST', `Mark ${selectedAsset.tag} as lost?`)}
                    >
                      <AlertTriangle size={13} /> Mark Lost
                    </button>
                  )}
                  {(selectedAsset.status === 'LOST' || selectedAsset.status === 'RETIRED') && (
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={isPending}
                      onClick={() => handleLifecycle('AVAILABLE', `Restore ${selectedAsset.tag} to available?`)}
                    >
                      <RotateCcw size={13} /> Restore to Available
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Register Modal */}
      {showRegister && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowRegister(false) }}>
          <div className="dialog">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
              <h2 className="dialog-title">Register New Asset</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowRegister(false)}><X size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Asset Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dell Laptop" />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-select" value={form.categoryId} onChange={e => { const categoryId = e.target.value; setForm(f => ({ ...f, categoryId })); setCustomValues({}) }}>
                  <option value="">Select category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Serial Number</label>
                <input className="form-input" value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} placeholder="SN-123456" />
              </div>
              <div className="form-group">
                <label className="form-label">Acquisition Date</label>
                <input type="date" className="form-input" value={form.acquisitionDate} onChange={e => setForm(f => ({ ...f, acquisitionDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Acquisition Cost (₹)</label>
                <input type="number" className="form-input" value={form.acquisitionCost} onChange={e => setForm(f => ({ ...f, acquisitionCost: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Condition</label>
                <select className="form-select" value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                  <option value="">Select</option>
                  <option>Good</option><option>Fair</option><option>Damaged</option><option>New</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. 3rd Floor - Room 301" />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="form-select" value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                  <option value="">— None —</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Photo URL</label>
                <input className="form-input" value={form.photoUrl} onChange={e => setForm(f => ({ ...f, photoUrl: e.target.value }))} placeholder="https://example.com/asset-photo.jpg" />
                <span className="form-hint">Optional — direct link to an image of this asset</span>
              </div>
              {customFieldDefs.length > 0 && (
                <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', borderTop: '1px solid var(--border)', paddingTop: '0.9rem' }}>
                  <div style={{ gridColumn: '1 / -1', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>
                    {selectedCategory.name} Details
                  </div>
                  {customFieldDefs.map(([key, hint]) => (
                    <div key={key} className="form-group">
                      <label className="form-label">{key}</label>
                      <input
                        className="form-input"
                        value={customValues[key] ?? ''}
                        placeholder={hint}
                        onChange={e => { const value = e.target.value; setCustomValues(v => ({ ...v, [key]: value })) }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="isBookable" checked={form.isBookable} onChange={e => setForm(f => ({ ...f, isBookable: e.target.checked }))} style={{ accentColor: 'var(--brand-600)' }} />
                <label htmlFor="isBookable" style={{ fontSize: '0.855rem', color: 'var(--text-2)', fontWeight: 500 }}>This is a shared/bookable resource (room, vehicle, etc.)</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowRegister(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRegister} disabled={!form.name || !form.categoryId || isPending}>
                {isPending ? 'Registering...' : 'Register Asset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
