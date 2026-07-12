'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signupAction } from '@/lib/actions/auth'
import { AuthPanel } from '@/components/AuthPanel'
import { AlertCircle, Info } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // NOTE: No role field is sent — signup always creates EMPLOYEE
      const result = await signupAction(form)
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/login?registered=1')
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <AuthPanel />
        <div className="auth-card">
          <div className="auth-logo">Create your account</div>
          <p className="auth-subtitle">Join your organization on AssetFlow</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <div className="inline-alert error">
                <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <input id="name" type="text" className="form-input" placeholder="Jane Smith" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Work Email</label>
              <input id="email" type="email" className="form-input" placeholder="name@company.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input id="password" type="password" className="form-input" placeholder="At least 6 characters" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
            </div>

            {/* NOTE: There is intentionally NO role selector on this form — not even hidden */}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.65rem' }} disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="inline-alert info" style={{ marginTop: '1rem', fontSize: '0.75rem' }}>
            <Info size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>
              Signing up creates an <strong>Employee</strong> account. Roles like Department Head or
              Asset Manager are assigned by your Administrator in Organization Setup.
            </span>
          </div>

          <hr />
          <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-2)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--brand-600)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
