import { useEffect, useState } from 'react'
import { getCurrentUser, signIn, signOut, submitTwoFactorCode } from './authApi'
import './App.css'

function getCookie(name) {
  const prefix = `${name}=`
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(prefix))

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : ''
}

function SetPasswordPage() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const csrfResponse = await fetch('/sanctum/csrf-cookie', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })

      if (!csrfResponse.ok || !getCookie('XSRF-TOKEN')) {
        throw new Error('Could not start secure password setup. Please try again.')
      }

      const response = await fetch('/reset-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
        },
        body: JSON.stringify({
          token,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        const validationError =
          response.status === 422
            ? Object.values(result.errors ?? {}).flat()[0]
            : null

        if (response.status === 429) {
          throw new Error('Too many attempts. Please wait and try again.')
        }

        throw new Error(
          validationError ??
          'The password link may be invalid or expired. Request a new link.',
        )
      }

      setComplete(true)
      setPassword('')
      setPasswordConfirmation('')
    } catch (requestError) {
      setError(
        requestError instanceof Error && requestError.message !== 'Failed to fetch'
          ? requestError.message
          : 'Could not reach the server. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!token || !email) {
    return (
      <section className="form-card">
        <h1>Set your password</h1>
        <p className="notice" role="alert">
          This link is incomplete. Ask for a new password setup link.
        </p>
      </section>
    )
  }

  if (complete) {
    return (
      <section className="form-card">
        <h1>Password set</h1>
        <p className="notice" role="status">
          Your password has been set. You can now sign in.
        </p>
      </section>
    )
  }

  return (
    <section className="form-card">
      <h1>Set your password</h1>
      <p className="intro">
        Choose a password to activate your account.
      </p>

      <form onSubmit={handleSubmit}>
        <label className="field">
          <span>Email address</span>
          <input type="email" value={email} readOnly />
        </label>

        <label className="field">
          <span>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={15}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <p className="hint">
          Use 15–128 characters. Avoid passwords found in known data breaches.
        </p>

        <label className="field">
          <span>Confirm new password</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={15}
            maxLength={128}
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            required
          />
        </label>

        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Setting password…' : 'Set password'}
        </button>
      </form>
    </section>
  )
}





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