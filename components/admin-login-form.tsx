'use client'

import { useState } from 'react'

export function AdminLoginForm({ initialMessage }: { initialMessage: string }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState(initialMessage)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const result = await response.json() as { message?: string }
      if (!response.ok) {
        setMessage(result.message ?? 'That password is not correct.')
        return
      }
      window.location.assign('/write')
    } catch {
      setMessage('Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="admin-login-form" onSubmit={handleSubmit}>
      <label className="field-label" htmlFor="admin-password">Password</label>
      <div className="password-input-wrap">
        <input
          id="admin-password"
          className="composer-text-input"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button
          type="button"
          className="password-visibility-toggle"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          onClick={() => setShowPassword((visible) => !visible)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z" />
            <circle cx="12" cy="12" r="2.5" />
            {showPassword && <path d="m4 4 16 16" />}
          </svg>
        </button>
      </div>
      <button className="composer-submit-btn" type="submit" disabled={submitting}>
        {submitting ? 'Signing in...' : 'Sign in'}
      </button>
      {message && <p className="manager-feedback" role="status">{message}</p>}
    </form>
  )
}
