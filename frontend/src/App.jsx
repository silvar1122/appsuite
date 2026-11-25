import { useEffect, useState } from 'react'
import {getCurrentUser, signIn, signOut, submitTwoFactorCode} from './authApi'
import './App.css'
import SetPasswordPage from './pages/SetPasswordPage'
import LoginPage from './pages/LoginPage'
import TwoFactorChallengePage from './pages/TwoFactorChallengePage'
import MfaSetupPage from './pages/MfaSetupPage'








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