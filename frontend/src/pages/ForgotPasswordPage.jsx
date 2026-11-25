import { useState } from 'react'
import '../App.css'

export default function ForgotPasswordPage({ onSubmit, onBack, submitting, error }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const succeeded = await onSubmit(email)
    if (succeeded) setSent(true)
  }

  return (
    <section className="form-card">
      <h1>Reset your password</h1>

      {sent ? (
        <>
          <p className="notice" role="status">
            If the email address is registered, a password reset link will be sent.
          </p>
          <button type="button" className="secondary-button" onClick={onBack}>
            Back to sign in
          </button>
        </>
      ) : (
        <>
          <p className="intro">
            Enter your work email address to request a password reset link.
          </p>

          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            {error && <p className="notice error" role="alert">{error}</p>}

            <button type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={onBack}
              disabled={submitting}
            >
              Back to sign in
            </button>
          </form>
        </>
      )}
    </section>
  )
}