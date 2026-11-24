import { useEffect, useState } from 'react'
import {
  confirmPassword, confirmTwoFactor, enableTwoFactor, getCurrentUser, getRecoveryCodes,
  getTwoFactorSetup, signIn, signOut, submitTwoFactorCode
} from './authApi'
import './App.css'
import SetPasswordPage from './pages/SetPasswordPage'






function LoginPage({ onSubmit, submitting, error }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(email, password)
  }

  return (
    <section className="form-card">
      <h1>Sign in</h1>
      <p className="intro">Sign in to access your company asset account.</p>

      <form onSubmit={handleSubmit}>
        <label className="field">
          <span>Email address</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
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
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="hint">
          Need to reset your password? Use the password reset link sent to your email.
        </p>
      </form>
    </section>
  )
}

function TwoFactorChallengePage({ onSubmit, onBack, submitting, error }) {
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

        <button type="button" className="secondary-button" onClick={onBack}>
          Back to sign in
        </button>
      </form>
    </section>
  )
}


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

function AccountPage({ user, onSignOut, signingOut, error }) {
  const requiresSetup = user.requires_mfa && !user.mfa_confirmed

  return (
    <section className="form-card">
      <h1>{requiresSetup ? 'MFA setup required' : 'Signed in'}</h1>
      <p className="intro">
        Signed in as {user.first_name} {user.last_name}.
      </p>

      {requiresSetup ? (
        <p className="notice">
          Set up your authenticator app before using protected asset features.
          We’ll add the enrollment screen next.
        </p>
      ) : (
        <p className="notice">
          Authentication is working. Asset pages will be added next.
        </p>
      )}

      {error && <p className="notice error" role="alert">{error}</p>}

      <button type="button" onClick={onSignOut} disabled={signingOut}>
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </section>
  )
}


function App() {
  const isSetPasswordPage = window.location.pathname === '/set-password'

  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(!isSetPasswordPage)
  const [challengeRequired, setChallengeRequired] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isSetPasswordPage) return

    let active = true

    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser)
      })
      .catch(() => {
        if (active) setError('Could not check your sign-in session. Please try again.')
      })
      .finally(() => {
        if (active) setCheckingSession(false)
      })

    return () => {
      active = false
    }
  }, [isSetPasswordPage])

  async function handleSignIn(email, password) {
    setError('')
    setSubmitting(true)

    try {
      const result = await signIn(email, password)
      setChallengeRequired(result.challengeRequired)
      setUser(result.user)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTwoFactor(code) {
    setError('')
    setSubmitting(true)

    try {
      const currentUser = await submitTwoFactorCode(code)
      setUser(currentUser)
      setChallengeRequired(false)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignOut() {
    setError('')
    setSubmitting(true)

    try {
      await signOut()
      setUser(null)
      setChallengeRequired(false)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  let page

  if (isSetPasswordPage) {
    page = <SetPasswordPage />
  } else if (checkingSession) {
    page = <section className="form-card"><p>Checking your session…</p></section>
  } else if (challengeRequired) {
    page = (
      <TwoFactorChallengePage
        onSubmit={handleTwoFactor}
        onBack={() => {
          setChallengeRequired(false)
          setError('')
        }}
        submitting={submitting}
        error={error}
      />
    )
  } else if (!user) {
    page = (
      <LoginPage
        onSubmit={handleSignIn}
        submitting={submitting}
        error={error}
      />
    )
  } else if (user.requires_mfa && !user.mfa_confirmed) {
    page = <MfaSetupPage onComplete={setUser} />
  } else {
    page = (
      <AccountPage
        user={user}
        onSignOut={handleSignOut}
        signingOut={submitting}
        error={error}
      />
    )
  }

  return (
    <main className="app-shell">
      <header className="site-header">Company Asset Register</header>
      <div className="page-content">{page}</div>
      <footer className="site-footer">IT asset management</footer>
    </main>
  )
}

export default App