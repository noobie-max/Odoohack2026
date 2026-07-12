'use client'

import { useState, useTransition } from 'react'
import { registerAsset } from '@/lib/actions/assets'
import { Package, Plus, Search, X, ChevronRight } from 'lucide-react'
import { assetStatusColors, formatDate } from '@/lib/utils'

const STATUS_OPTIONS = ['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED']

export function AssetsClient({ assets, categories, departments, userRole }: any) {
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
    acquisitionCost: '', condition: '', location: '', isBookable: false, departmentId: ''
  })

  const canRegister = userRole === 'ASSET_MANAGER' || userRole === 'ADMIN'

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
      })
      if (result.error) { setMessage('Error: ' + result.error); return }
      setMessage('Asset registered: ' + (result.asset as any)?.tag)
      setShowRegister(false)
      setForm({ name: '', categoryId: '', serialNumber: '', acquisitionDate: '', acquisitionCost: '', condition: '', location: '', isBookable: false, departmentId: '' })
    })
  }

  return (
    <div style={{ display: 'flex', gap: '1.5rem' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="section-header">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Asset Registry</h1>
          {canRegister && (
            <button className="btn btn-primary" onClick={() => setShowRegister(true)}>
              <Plus size={16} /> Register Asset
            </button>
          )}
        </div>

        {message && (
          <div style={{ background: message.startsWith('Error') ? '#fef2f2' : '#f0fdf4', border: '1px solid', borderColor: message.startsWith('Error') ? '#fecaca' : '#bbf7d0', color: message.startsWith('Error') ? '#991b1b' : '#166534', padding: '0.625rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
            {message}
          </div>
        )}

        {/* Filters */}
        <div className="card filter-bar">
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="form-input" style={{ paddingLeft: '2rem' }} placeholder="Search by tag, name, or serial..." value={search} onChange={e => setSearch(e.target.value)} />
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
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Tag</th><th>Name</th><th>Category</th><th>Status</th><th>Department</th><th>Location</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">No assets found</div>
                </td></tr>
              ) : filtered.map((asset: any) => (
                <tr key={asset.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedAsset(asset)}>
                  <td><span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem', background: '#f1f5f9', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>{asset.tag}</span></td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{asset.name}</div>
                    {asset.allocations?.[0] && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Held by: {asset.allocations[0].employee.name}</div>}
                  </td>
                  <td style={{ color: '#64748b' }}>{asset.category?.name}</td>
                  <td>
                    <span className={`badge ${assetStatusColors[asset.status] || ''}`}>{asset.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td style={{ color: '#64748b' }}>{asset.department?.name || '—'}</td>
                  <td style={{ color: '#64748b' }}>{asset.location || '—'}</td>
                  <td><ChevronRight size={16} style={{ color: '#94a3b8' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedAsset && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedAsset(null)} />
          <div className="drawer">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', background: '#eff6ff', color: '#1d4ed8', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', display: 'inline-block' }}>{selectedAsset.tag}</div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0.5rem 0 0' }}>{selectedAsset.name}</h2>
              </div>
              <button className="btn btn-ghost" onClick={() => setSelectedAsset(null)}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
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
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>{label}</div>
                  <div style={{ fontSize: '0.875rem', color: '#0f172a' }}>{value}</div>
                </div>
              ))}
            </div>

            <hr />
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: '0.75rem 0 0.5rem' }}>Allocation History</h3>
            {selectedAsset.allocations?.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No allocation history</div>
            ) : selectedAsset.allocations?.map((alloc: any) => (
              <div key={alloc.id} style={{ padding: '0.625rem', background: '#f8fafc', borderRadius: '0.375rem', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 600 }}>{alloc.employee?.name}</div>
                <div style={{ color: '#64748b' }}>
                  {formatDate(alloc.allocatedDate)} → {alloc.actualReturnDate ? formatDate(alloc.actualReturnDate) : 'Present'}
                  <span className={`badge ${alloc.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' : alloc.status === 'OVERDUE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`} style={{ marginLeft: 8 }}>{alloc.status}</span>
                </div>
              </div>
            ))}

            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: '0.75rem 0 0.5rem' }}>Maintenance History</h3>
            {selectedAsset.maintenance?.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No maintenance history</div>
            ) : selectedAsset.maintenance?.map((mr: any) => (
              <div key={mr.id} style={{ padding: '0.625rem', background: '#f8fafc', borderRadius: '0.375rem', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 600 }}>{mr.issueDescription}</div>
                <div style={{ color: '#64748b' }}>{formatDate(mr.createdAt)} — {mr.status}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Register Modal */}
      {showRegister && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowRegister(false) }}>
          <div className="dialog">
            <h2 className="dialog-title">Register New Asset</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Asset Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dell Laptop" />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-select" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
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
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="isBookable" checked={form.isBookable} onChange={e => setForm(f => ({ ...f, isBookable: e.target.checked }))} />
                <label htmlFor="isBookable" style={{ fontSize: '0.875rem', color: '#374151' }}>This is a shared/bookable resource (room, vehicle, etc.)</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
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
