import { useEffect, useState } from 'react'
import { getCurrentUser, signIn, signOut, requestPasswordReset, submitTwoFactorCode, submitTwoFactorRecoveryCode } from './authApi'
import './App.css'
import SetPasswordPage from './pages/SetPasswordPage'
import LoginPage from './pages/LoginPage'
import TwoFactorChallengePage from './pages/TwoFactorChallengePage'
import MfaSetupPage from './pages/MfaSetupPage'
import AccountPage from './pages/AccountPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'

function App() {
  const isSetPasswordPage = window.location.pathname === '/set-password'
  const isForgotPasswordPage = window.location.pathname === '/request-password-reset'

  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(!isSetPasswordPage && !isForgotPasswordPage)
  const [challengeRequired, setChallengeRequired] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isSetPasswordPage || isForgotPasswordPage) return

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
  }, [isSetPasswordPage, isForgotPasswordPage])

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

  

  async function handlePasswordResetRequest(email) {
    setError('')
    setSubmitting(true)

    try {
      await requestPasswordReset(email)
      return true
    } catch (requestError) {
      setError(requestError.message)
      return false
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTwoFactor(credential, method) {
    setError('')
    setSubmitting(true)

    try {
      const currentUser = method === 'recovery'
        ? await submitTwoFactorRecoveryCode(credential)
        : await submitTwoFactorCode(credential)

      setUser(currentUser)
      setChallengeRequired(false)
      return true
    } catch (requestError) {
      setError(requestError.message)
      return false
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
  } else if (isForgotPasswordPage) {
    page = (
      <ForgotPasswordPage
        onSubmit={handlePasswordResetRequest}
        onBack={() => {
          window.location.href = '/'
        }}
        submitting={submitting}
        error={error}
      />
    )
  } else if (checkingSession) {
    page = <section className="form-card"><p>Checking your session…</p></section>
  } else if (challengeRequired) {
    page = (
      <TwoFactorChallengePage
        onSubmit={handleTwoFactor}
        onMethodChange={() => setError('')}
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