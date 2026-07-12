'use client'

import { useState, useTransition } from 'react'
import { createDepartment, updateDepartment, createCategory, updateCategory, promoteUser, updateUserStatus } from '@/lib/actions/org'
import { Building2, Tag, Users, Plus, Edit, CheckCircle, X } from 'lucide-react'

type Dept = { id: string; name: string; head: { name: string } | null; parent: { name: string } | null; status: string }
type Category = { id: string; name: string; customFields: any }
type User = { id: string; name: string; email: string; role: string; status: string; department: { name: string } | null }

const ROLES = ['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN']

const roleColors: Record<string, string> = {
  EMPLOYEE: 'bg-gray-100 text-gray-700',
  DEPARTMENT_HEAD: 'bg-blue-100 text-blue-700',
  ASSET_MANAGER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-red-100 text-red-700',
}

export function OrgSetupClient({ departments, categories, users }: { departments: Dept[]; categories: Category[]; users: User[] }) {
  const [activeTab, setActiveTab] = useState<'departments' | 'categories' | 'employees'>('departments')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')

  // Dept form
  const [deptForm, setDeptForm] = useState({ name: '', headId: '', parentId: '', status: 'ACTIVE' })
  const [editingDept, setEditingDept] = useState<string | null>(null)
  const [showDeptForm, setShowDeptForm] = useState(false)

  // Category form
  const [catForm, setCatForm] = useState({ name: '', customFields: '' })
  const [showCatForm, setShowCatForm] = useState(false)

  function showMsg(msg: string) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  function handleAddDept() {
    startTransition(async () => {
      const result = await createDepartment({
        name: deptForm.name,
        headId: deptForm.headId || undefined,
        parentId: deptForm.parentId || undefined,
        status: deptForm.status as 'ACTIVE' | 'INACTIVE',
      })
      if (result.error) { showMsg('Error: ' + result.error); return }
      showMsg('Department created!')
      setDeptForm({ name: '', headId: '', parentId: '', status: 'ACTIVE' })
      setShowDeptForm(false)
    })
  }

  function handleAddCategory() {
    startTransition(async () => {
      let customFields: Record<string, string> | undefined
      if (catForm.customFields.trim()) {
        try {
          customFields = JSON.parse(catForm.customFields)
        } catch {
          showMsg('Custom fields must be valid JSON (e.g. {"warrantyMonths": "24"})')
          return
        }
      }
      const result = await createCategory({ name: catForm.name, customFields })
      if (result.error) { showMsg('Error: ' + result.error); return }
      showMsg('Category created!')
      setCatForm({ name: '', customFields: '' })
      setShowCatForm(false)
    })
  }

  function handlePromoteUser(userId: string, role: string, departmentId?: string) {
    startTransition(async () => {
      const result = await promoteUser({ userId, role: role as any, departmentId })
      if (result.error) { showMsg('Error: ' + result.error); return }
      showMsg('Role updated successfully!')
    })
  }

  function handleToggleUserStatus(userId: string, currentStatus: string) {
    startTransition(async () => {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      await updateUserStatus(userId, newStatus)
      showMsg(`User ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Organization Setup</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>Manage departments, categories, and employee roles</p>
        </div>
      </div>

      {message && (
        <div style={{ background: message.startsWith('Error') ? '#fef2f2' : '#f0fdf4', border: '1px solid', borderColor: message.startsWith('Error') ? '#fecaca' : '#bbf7d0', color: message.startsWith('Error') ? '#991b1b' : '#166534', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
          {message}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tabs-list">
          {(['departments', 'categories', 'employees'] as const).map(tab => (
            <button key={tab} className={`tab-trigger ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'departments' ? <><Building2 size={14} style={{ display: 'inline', marginRight: 4 }} />Departments</> :
               tab === 'categories' ? <><Tag size={14} style={{ display: 'inline', marginRight: 4 }} />Categories</> :
               <><Users size={14} style={{ display: 'inline', marginRight: 4 }} />Employees</>}
            </button>
          ))}
        </div>

        <div style={{ padding: '1.25rem' }}>
          {/* DEPARTMENTS TAB */}
          {activeTab === 'departments' && (
            <div>
              <div className="section-header">
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{departments.length} department{departments.length !== 1 ? 's' : ''}</span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowDeptForm(!showDeptForm)}>
                  <Plus size={14} /> Add Department
                </button>
              </div>

              {showDeptForm && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Department Name *</label>
                      <input className="form-input" value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Engineering" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Department Head</label>
                      <select className="form-select" value={deptForm.headId} onChange={e => setDeptForm(f => ({ ...f, headId: e.target.value }))}>
                        <option value="">— None —</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Parent Department</label>
                      <select className="form-select" value={deptForm.parentId} onChange={e => setDeptForm(f => ({ ...f, parentId: e.target.value }))}>
                        <option value="">— None (top-level) —</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={deptForm.status} onChange={e => setDeptForm(f => ({ ...f, status: e.target.value }))}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={handleAddDept} disabled={!deptForm.name || isPending}>Save</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowDeptForm(false)}>Cancel</button>
                  </div>
                </div>
              )}

              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Head</th><th>Parent</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {departments.map(dept => (
                    <tr key={dept.id}>
                      <td style={{ fontWeight: 500 }}>{dept.name}</td>
                      <td>{dept.head?.name || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      <td>{dept.parent?.name || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      <td>
                        <span className={`badge ${dept.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {dept.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CATEGORIES TAB */}
          {activeTab === 'categories' && (
            <div>
              <div className="section-header">
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCatForm(!showCatForm)}>
                  <Plus size={14} /> Add Category
                </button>
              </div>

              {showCatForm && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Category Name *</label>
                      <input className="form-input" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Electronics" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Custom Fields (JSON)</label>
                      <input className="form-input" value={catForm.customFields} onChange={e => setCatForm(f => ({ ...f, customFields: e.target.value }))} placeholder='{"warrantyMonths": "24"}' />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={handleAddCategory} disabled={!catForm.name || isPending}>Save</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowCatForm(false)}>Cancel</button>
                  </div>
                </div>
              )}

              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Custom Fields</th><th>Assets</th></tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id}>
                      <td style={{ fontWeight: 500 }}>{cat.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
                        {cat.customFields ? JSON.stringify(cat.customFields) : <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                      <td>—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* EMPLOYEES TAB - THE ONLY PLACE TO ASSIGN ROLES */}
          {activeTab === 'employees' && (
            <div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#1e40af' }}>
                ⚠️ This is the <strong>only place</strong> in the system where user roles can be assigned. Changes take effect immediately.
              </div>
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Department</th><th>Role</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>{u.name}</td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{u.email}</td>
                      <td>{u.department?.name || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      <td>
                        <select
                          className="form-select"
                          style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                          defaultValue={u.role}
                          onChange={e => handlePromoteUser(u.id, e.target.value)}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                        </select>
                      </td>
                      <td>
                        <span className={`badge ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                        >
                          {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
