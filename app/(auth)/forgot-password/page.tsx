'use client'

import { useState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '@/lib/actions/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [devResetUrl, setDevResetUrl] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setDevResetUrl('')
    setLoading(true)
    try {
      const result = await requestPasswordReset(email)
      setMessage(result.message || 'If an account exists for that email, a reset link has been generated.')
      if ('devResetUrl' in result && result.devResetUrl) {
        setDevResetUrl(result.devResetUrl)
      }
    } catch {
      setMessage('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card standalone">
        <div className="auth-logo">Asset<span>Flow</span></div>
        <p className="auth-subtitle">Reset your password</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {message && (
            <div className="inline-alert info">
              {message}
            </div>
          )}

          {devResetUrl && (
            <div className="inline-alert success" style={{ fontSize: '0.8rem' }}>
              <span>
                <strong>Demo mode:</strong> no email service is configured, so here is your reset link:{' '}
                <Link href={devResetUrl} style={{ color: '#065f46', fontWeight: 600, textDecoration: 'underline', wordBreak: 'break-all' }}>
                  {devResetUrl}
                </Link>
              </span>
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.625rem' }} disabled={loading}>
            {loading ? 'Generating link...' : 'Send Reset Link'}
          </button>
        </form>

        <hr />
        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-2)' }}>
          Remembered it?{' '}
          <Link href="/login" style={{ color: 'var(--brand-600)', textDecoration: 'none', fontWeight: 600 }}>Back to Sign In</Link>
        </div>
      </div>
    </div>
  )
}
