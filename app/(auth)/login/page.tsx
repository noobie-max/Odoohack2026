'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthPanel } from '@/components/AuthPanel'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get('registered') === '1'
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
    <div className="auth-card">
      <div className="auth-logo">Welcome back</div>
      <p className="auth-subtitle">Sign in to your AssetFlow workspace</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {justRegistered && !error && (
          <div className="inline-alert success">
            <CheckCircle2 size={15} style={{ marginTop: 1, flexShrink: 0 }} />
            Account created — sign in to get started.
          </div>
        )}
        {error && (
          <div className="inline-alert error">
            <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
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
            <Link href="/forgot-password" style={{ color: 'var(--brand-600)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.65rem' }} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <hr />
      <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-2)' }}>
        New here?{' '}
        <Link href="/signup" style={{ color: 'var(--brand-600)', textDecoration: 'none', fontWeight: 600 }}>Create Account</Link>
      </div>
      <div className="inline-alert info" style={{ marginTop: '0.85rem', fontSize: '0.75rem' }}>
        <span>
          Signing up creates an <strong>Employee</strong> account — admin roles are assigned later by an Administrator.
        </span>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        <AuthPanel />
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
