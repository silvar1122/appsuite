import { useState } from 'react'
import {
  confirmPassword,
  confirmTwoFactor,
  enableTwoFactor,
  getCurrentUser,
  getRecoveryCodes,
  getTwoFactorSetup,
} from '../authApi'
import '../App.css'

export default function MfaSetupPage({ onComplete }) {

    

function MfaSetupPage({ onComplete }) {
  const [password, setPassword] = useState('')
  const [setup, setSetup] = useState(null)
  const [code, setCode] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState(null)
  const [codesSaved, setCodesSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function startSetup(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await confirmPassword(password)
      setPassword('')

      await enableTwoFactor()
      const details = await getTwoFactorSetup()
      setSetup(details)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function loadRecoveryCodes() {
    setError('')
    setSubmitting(true)

    try {
      const codes = await getRecoveryCodes()

      if (codes.length === 0) {
        throw new Error('No recovery codes were returned. Please try again.')
      }

      setRecoveryCodes(codes)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmCode(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await confirmTwoFactor(code)
      setCode('')
      setSetup(null)
      setConfirmed(true)

      try {
        const codes = await getRecoveryCodes()

        if (codes.length === 0) {
          throw new Error('No recovery codes were returned.')
        }

        setRecoveryCodes(codes)
      } catch {
        setError('MFA is enabled, but recovery codes could not be loaded. Use the button below to retry.')
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function finishSetup() {
    setError('')
    setSubmitting(true)

    try {
      const user = await getCurrentUser()

      if (!user || !user.mfa_confirmed) {
        throw new Error('MFA setup is not confirmed yet. Please try again.')
      }

      setSetup(null)
      setRecoveryCodes(null)
      onComplete(user)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="form-card">
      <h1>Set up authenticator MFA</h1>
      <p className="intro">
        Asset Managers must confirm an authenticator app before accessing protected features.
      </p>

      {!setup && !confirmed && (
        <form onSubmit={startSetup}>
          <label className="field">
            <span>Confirm your password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className="notice error" role="alert">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Preparing setup…' : 'Continue'}
          </button>
        </form>
      )}

      {setup && !confirmed && (
        <>
          <p>Scan this QR code with your authenticator app.</p>
          <img
            className="mfa-qr"
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.qrSvg)}`}
            alt="Authenticator setup QR code"
          />

          <p className="hint">If you cannot scan the code, enter this key manually:</p>
          <p className="secret-key"><code>{setup.secretKey}</code></p>

          <form onSubmit={confirmCode}>
            <label className="field">
              <span>Authenticator code</span>
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
              {submitting ? 'Confirming…' : 'Confirm authenticator'}
            </button>
          </form>
        </>
      )}

      {confirmed && (
        <>
          <p className="notice">
            MFA is confirmed. Store these recovery codes somewhere secure. Each code can be used once if you lose access to your authenticator.
          </p>

          {recoveryCodes ? (
            <>
              <ul className="recovery-codes">
                {recoveryCodes.map((recoveryCode) => (
                  <li key={recoveryCode}><code>{recoveryCode}</code></li>
                ))}
              </ul>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={codesSaved}
                  onChange={(event) => setCodesSaved(event.target.checked)}
                />
                <span>I have stored these recovery codes securely.</span>
              </label>
            </>
          ) : (
            <button
              type="button"
              onClick={loadRecoveryCodes}
              disabled={submitting}
            >
              {submitting ? 'Loading codes…' : 'Load recovery codes'}
            </button>
          )}

          {error && <p className="notice error" role="alert">{error}</p>}

          {recoveryCodes && (
            <button
              type="button"
              onClick={finishSetup}
              disabled={!codesSaved || submitting}
            >
              {submitting ? 'Finishing…' : 'Continue'}
            </button>
          )}
        </>
      )}
    </section>
  )
}

}