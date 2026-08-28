import { useState } from 'react'
import { authApi } from '../services/profileApi'

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm_password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (mode === 'signup' && form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const result =
        mode === 'signup'
          ? await authApi.signup(form)
          : await authApi.login({ email: form.email, password: form.password })

      localStorage.setItem('authToken', result.token)
      onLogin(result.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page hero-auth-page">
      {/* ── Left hero panel ── */}
      <div className="hero-panel">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="hero-blob hero-blob-3" />

        <div className="hero-content">
          <div className="hero-logo">❤</div>

          <h1 className="hero-title">Smart Blood<br />Donation Platform</h1>
          <p className="hero-subtitle">
            Connecting blood donors with those in critical need — fast, reliably, and securely. Join thousands of verified donors saving lives every day.
          </p>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-icon">🩸</span>
              <div>
                <strong>All 8 Blood Types</strong>
                <span>A, B, AB &amp; O — positive and negative</span>
              </div>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-icon">🚨</span>
              <div>
                <strong>Emergency Alerts</strong>
                <span>Real-time urgent blood requests</span>
              </div>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-icon">✅</span>
              <div>
                <strong>Verified Donors</strong>
                <span>Admin-reviewed donor profiles</span>
              </div>
            </div>
          </div>

          <div className="hero-trust">
            <span className="hero-trust-dot" />
            Platform is live and accepting donors
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="hero-form-panel">
        <div className="auth-card hero-auth-card">
          <div className="auth-logo">❤</div>

          <div className="auth-header">
            <h2>{mode === 'signup' ? 'Create Account' : 'Welcome Back'}</h2>
            <p>
              {mode === 'signup'
                ? 'Join the donor network and help save lives.'
                : 'Log in to access the donor management platform.'}
            </p>
          </div>

          {error && <div className="alert error-alert" style={{ marginBottom: '16px' }}>{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label htmlFor="auth-username" className="field">
                <span>Username</span>
                <input
                  id="auth-username"
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  required
                  autoComplete="username"
                />
              </label>
            )}

            <label htmlFor="auth-email" className="field">
              <span>{mode === 'signup' ? 'Email Address' : 'Email or Username'}</span>
              <input
                id="auth-email"
                type={mode === 'signup' ? 'email' : 'text'}
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder={mode === 'signup' ? 'you@example.com' : 'admin or admin@blooddonation.com'}
                required
                autoComplete="username"
              />
            </label>

            <label htmlFor="auth-password" className="field">
              <span>Password</span>
              <input
                id="auth-password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </label>

            {mode === 'signup' && (
              <label htmlFor="auth-confirm" className="field">
                <span>Confirm Password</span>
                <input
                  id="auth-confirm"
                  type="password"
                  name="confirm_password"
                  value={form.confirm_password}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
                />
              </label>
            )}

            <button
              type="submit"
              className="save-button"
              disabled={loading}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {loading ? 'Please wait…' : mode === 'signup' ? 'Create Account' : 'Log In'}
            </button>
          </form>

          <div className="auth-footer">
            {mode === 'signup' ? (
              <>Already have an account?{' '}
                <button type="button" className="link-btn" onClick={() => { setMode('login'); setError('') }}>
                  Log in
                </button>
              </>
            ) : (
              <>Don&apos;t have an account?{' '}
                <button type="button" className="link-btn" onClick={() => { setMode('signup'); setError('') }}>
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
