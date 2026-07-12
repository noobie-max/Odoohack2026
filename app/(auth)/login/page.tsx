'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        setError('Invalid email or password.')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Asset<span>Flow</span></div>
        <p className="auth-subtitle">Enterprise Asset & Resource Management</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="name@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <div style={{ textAlign: 'right' }}>
              <button type="button" style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', cursor: 'pointer' }}
                onClick={() => alert('Password reset email sent (demo stub).')}>
                Forgot password?
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.625rem' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <hr />
        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          New here?{' '}
          <Link href="/signup" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>Create Account</Link>
        </div>
        <div style={{ marginTop: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem', padding: '0.625rem', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
          <strong>Note:</strong> Sign up creates an employee account. Admin roles are assigned later by an Administrator.
        </div>
      </div>
    </div>
  )
}
