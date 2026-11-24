import { useState } from 'react'
import '../App.css'

export default function TwoFactorChallengePage({
  onSubmit,
  onBack,
  submitting,
  error,
}) {
  const [code, setCode] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(code)
    setCode('')
  }

  return (
    <section className="form-card">
      <h1>Verify your sign-in</h1>
      <p className="intro">
        Enter the current six-digit code from your authenticator app.
      </p>

      <form onSubmit={handleSubmit}>
        <label className="field">
          <span>Authentication code</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
        </label>

        {error && <p className="notice error" role="alert">{error}</p>}

        <button type="submit" disabled={submitting || code.length !== 6}>
          {submitting ? 'Verifying…' : 'Verify code'}
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
        >
          Back to sign in
        </button>
      </form>
    </section>
  )
}