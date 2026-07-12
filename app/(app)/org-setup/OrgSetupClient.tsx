'use client'

import { useState, useTransition } from 'react'
import { createDepartment, updateDepartment, createCategory, updateCategory, promoteUser, updateUserStatus } from '@/lib/actions/org'
import {
  Building2, Tag, Users, Plus, Pencil, X, CheckCircle2, AlertCircle, Info, UserCheck, UserX,
} from 'lucide-react'

type Dept = {
  id: string
  name: string
  headId: string | null
  parentId: string | null
  head: { name: string } | null
  parent: { name: string } | null
  status: string
}
type Category = { id: string; name: string; customFields: any }
type User = { id: string; name: string; email: string; role: string; status: string; department: { name: string } | null }

const ROLES = ['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN']

type DialogState = { mode: 'create' } | { mode: 'edit'; id: string } | null

function fieldKeys(customFields: any): string[] {
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) return []
  return Object.keys(customFields)
}

export function OrgSetupClient({ departments, categories, users }: { departments: Dept[]; categories: Category[]; users: User[] }) {
  const [activeTab, setActiveTab] = useState<'departments' | 'categories' | 'employees'>('departments')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [dialogError, setDialogError] = useState('')

  // Department dialog
  const [deptDialog, setDeptDialog] = useState<DialogState>(null)
  const [deptForm, setDeptForm] = useState({ name: '', headId: '', parentId: '', status: 'ACTIVE' })

  // Category dialog
  const [catDialog, setCatDialog] = useState<DialogState>(null)
  const [catName, setCatName] = useState('')
  const [catFields, setCatFields] = useState<{ key: string; value: string }[]>([])

  function notify(kind: 'success' | 'error', text: string) {
    setMessage({ kind, text })
    setTimeout(() => setMessage(null), 3000)
  }

  function openDeptCreate() {
    setDeptForm({ name: '', headId: '', parentId: '', status: 'ACTIVE' })
    setDialogError('')
    setDeptDialog({ mode: 'create' })
  }

  function openDeptEdit(dept: Dept) {
    setDeptForm({ name: dept.name, headId: dept.headId ?? '', parentId: dept.parentId ?? '', status: dept.status })
    setDialogError('')
    setDeptDialog({ mode: 'edit', id: dept.id })
  }

  function handleSaveDept() {
    const dialog = deptDialog
    if (!dialog) return
    startTransition(async () => {
      const result = dialog.mode === 'edit'
        ? await updateDepartment(dialog.id, {
            name: deptForm.name,
            headId: deptForm.headId || null,
            parentId: deptForm.parentId || null,
            status: deptForm.status as 'ACTIVE' | 'INACTIVE',
          })
        : await createDepartment({
            name: deptForm.name,
            headId: deptForm.headId || undefined,
            parentId: deptForm.parentId || undefined,
            status: deptForm.status as 'ACTIVE' | 'INACTIVE',
          })
      if ('error' in result && result.error) { setDialogError(result.error); return }
      notify('success', dialog.mode === 'edit' ? 'Department updated.' : 'Department created.')
      setDeptDialog(null)
    })
  }

  function openCatCreate() {
    setCatName('')
    setCatFields([])
    setDialogError('')
    setCatDialog({ mode: 'create' })
  }

  function openCatEdit(cat: Category) {
    setCatName(cat.name)
    const cf = cat.customFields && typeof cat.customFields === 'object' && !Array.isArray(cat.customFields) ? cat.customFields : {}
    setCatFields(Object.entries(cf).map(([key, value]) => ({ key, value: String(value) })))
    setDialogError('')
    setCatDialog({ mode: 'edit', id: cat.id })
  }

  function handleSaveCategory() {
    const dialog = catDialog
    if (!dialog) return
    startTransition(async () => {
      const entries = catFields.filter(f => f.key.trim())
      const record: Record<string, string> = {}
      entries.forEach(f => { record[f.key.trim()] = f.value })
      const result = dialog.mode === 'edit'
        ? await updateCategory(dialog.id, { name: catName, customFields: entries.length ? record : null })
        : await createCategory({ name: catName, customFields: entries.length ? record : undefined })
      if ('error' in result && result.error) { setDialogError(result.error); return }
      notify('success', dialog.mode === 'edit' ? 'Category updated.' : 'Category created.')
      setCatDialog(null)
    })
  }

  function handlePromoteUser(userId: string, role: string, departmentId?: string) {
    startTransition(async () => {
      const result = await promoteUser({ userId, role: role as any, departmentId })
      if ('error' in result && result.error) { notify('error', result.error); return }
      notify('success', 'Role updated successfully!')
    })
  }

  function handleToggleUserStatus(userId: string, currentStatus: string) {
    startTransition(async () => {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      const result = await updateUserStatus(userId, newStatus)
      if ('error' in result && result.error) { notify('error', result.error); return }
      notify('success', `User ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`)
    })
  }

  const tabs = [
    { key: 'departments' as const, label: 'Departments', icon: Building2, count: departments.length },
    { key: 'categories' as const, label: 'Categories', icon: Tag, count: categories.length },
    { key: 'employees' as const, label: 'Employee Directory', icon: Users, count: users.length },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Organization Setup</h1>
          <p className="page-subtitle">Master data that everything else depends on — departments, categories, and people.</p>
        </div>
      </div>

      {message && (
        <div className={`inline-alert ${message.kind}`}>
          {message.kind === 'success'
            ? <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            : <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />}
          {message.text}
        </div>
      )}

      <div>
        <div className="tabs-list">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              className={`tab-trigger ${activeTab === key ? 'active' : ''}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={14} /> {label} ({count})
            </button>
          ))}
        </div>

        {/* DEPARTMENTS TAB */}
        {activeTab === 'departments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <span className="text-muted">{departments.length} department{departments.length !== 1 ? 's' : ''}</span>
              <button className="btn btn-primary btn-sm" onClick={openDeptCreate}>
                <Plus size={14} /> Add Department
              </button>
            </div>

            {departments.length === 0 ? (
              <div className="empty-state">
                <Building2 size={28} />
                No departments yet — create the first one to start structuring your org.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Head</th>
                      <th>Parent</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map(dept => (
                      <tr key={dept.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{dept.name}</td>
                        <td>{dept.head?.name || <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                        <td>{dept.parent?.name || <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                        <td>
                          <span className={`badge ${dept.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {dept.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openDeptEdit(dept)}>
                            <Pencil size={13} /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <span className="text-muted">{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</span>
              <button className="btn btn-primary btn-sm" onClick={openCatCreate}>
                <Plus size={14} /> Add Category
              </button>
            </div>

            {categories.length === 0 ? (
              <div className="empty-state">
                <Tag size={28} />
                No categories yet — categories drive custom fields on assets.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Custom Fields</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => {
                      const keys = fieldKeys(cat.customFields)
                      return (
                        <tr key={cat.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{cat.name}</td>
                          <td>
                            {keys.length > 0 ? (
                              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                {keys.map(k => (
                                  <span key={k} className="badge no-dot" style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', borderColor: 'var(--brand-200)' }}>
                                    {k}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-3)' }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openCatEdit(cat)}>
                              <Pencil size={13} /> Edit
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* EMPLOYEES TAB - THE ONLY PLACE TO ASSIGN ROLES */}
        {activeTab === 'employees' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div className="inline-alert info">
              <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>This is the <strong>only place</strong> in the system where user roles can be assigned. Changes take effect immediately.</span>
            </div>

            {users.length === 0 ? (
              <div className="empty-state">
                <Users size={28} />
                No employees found.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>
                        Role
                        <div className="form-hint" style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 500, marginTop: 2 }}>
                          Roles are assigned here only — signup never grants roles.
                        </div>
                      </th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                              background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
                              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.7rem', fontWeight: 700,
                            }}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-1)' }} className="truncate">{u.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }} className="truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{u.department?.name || <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                        <td>
                          <select
                            className="form-select"
                            style={{ width: 'auto', padding: '0.32rem 0.7rem', fontSize: '0.78rem', borderRadius: 7 }}
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
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: u.status === 'ACTIVE' ? 'var(--danger)' : 'var(--ok)' }}
                            onClick={() => handleToggleUserStatus(u.id, u.status)}
                            disabled={isPending}
                          >
                            {u.status === 'ACTIVE' ? <><UserX size={13} /> Deactivate</> : <><UserCheck size={13} /> Activate</>}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Department create / edit dialog */}
      {deptDialog && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setDeptDialog(null) }}>
          <div className="dialog">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <h2 className="dialog-title">{deptDialog.mode === 'edit' ? 'Edit Department' : 'New Department'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeptDialog(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {dialogError && (
              <div className="inline-alert error" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                {dialogError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
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
                  {departments
                    .filter(d => deptDialog.mode !== 'edit' || d.id !== deptDialog.id)
                    .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Status</label>
                <select className="form-select" value={deptForm.status} onChange={e => setDeptForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <div className="form-hint">Inactive departments are hidden from pickers but keep their history.</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.4rem' }}>
              <button className="btn btn-secondary" onClick={() => setDeptDialog(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveDept} disabled={!deptForm.name.trim() || isPending}>
                {isPending ? 'Saving…' : deptDialog.mode === 'edit' ? 'Save Changes' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category create / edit dialog */}
      {catDialog && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setCatDialog(null) }}>
          <div className="dialog">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <h2 className="dialog-title">{catDialog.mode === 'edit' ? 'Edit Category' : 'New Category'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setCatDialog(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {dialogError && (
              <div className="inline-alert error" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                {dialogError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input className="form-input" value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Electronics" />
              </div>

              <div className="form-group">
                <label className="form-label">Custom Fields</label>
                {catFields.length === 0 && (
                  <div className="form-hint">No custom fields yet — add key/value pairs like warrantyMonths → 24.</div>
                )}
                {catFields.map((field, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      className="form-input"
                      value={field.key}
                      onChange={e => setCatFields(fs => fs.map((f, idx) => idx === i ? { ...f, key: e.target.value } : f))}
                      placeholder="Key (e.g. warrantyMonths)"
                    />
                    <input
                      className="form-input"
                      value={field.value}
                      onChange={e => setCatFields(fs => fs.map((f, idx) => idx === i ? { ...f, value: e.target.value } : f))}
                      placeholder="Value (e.g. 24)"
                    />
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setCatFields(fs => fs.filter((_, idx) => idx !== i))}
                      aria-label="Remove field"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => setCatFields(fs => [...fs, { key: '', value: '' }])}
                >
                  <Plus size={13} /> Add field
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.4rem' }}>
              <button className="btn btn-secondary" onClick={() => setCatDialog(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveCategory} disabled={!catName.trim() || isPending}>
                {isPending ? 'Saving…' : catDialog.mode === 'edit' ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
