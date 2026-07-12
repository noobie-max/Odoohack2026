import { Boxes, ShieldCheck, CalendarClock, Wrench, ClipboardCheck } from 'lucide-react'

export function AuthPanel() {
  return (
    <div className="auth-brand-panel">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className="logo-mark">
            <Boxes size={18} />
          </div>
          <span style={{ fontFamily: 'var(--font-sora)', fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Asset<span style={{ color: 'var(--brand-400)' }}>Flow</span>
          </span>
        </div>

        <h2>Every asset, every booking, one source of truth.</h2>
        <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#8b96ad', margin: 0 }}>
          The enterprise platform for tracking assets through their full lifecycle —
          from registration to allocation, maintenance, audit, and retirement.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '2rem' }}>
        <div className="auth-feature">
          <ShieldCheck size={16} />
          <span>Conflict-free allocation with approval-based transfers</span>
        </div>
        <div className="auth-feature">
          <CalendarClock size={16} />
          <span>Time-slot resource booking with overlap protection</span>
        </div>
        <div className="auth-feature">
          <Wrench size={16} />
          <span>Structured maintenance workflow, from request to resolution</span>
        </div>
        <div className="auth-feature">
          <ClipboardCheck size={16} />
          <span>Audit cycles with auto-generated discrepancy reports</span>
        </div>
      </div>
    </div>
  )
}
