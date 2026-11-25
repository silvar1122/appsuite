import '../App.css'

export default function AccountPage({ user, onSignOut, signingOut, error }) {
  return (
    <section className="form-card">
      <h1>Signed in</h1>
      <p className="intro">
        Signed in as {user.first_name} {user.last_name}.
      </p>

      <p className="notice">
        Authentication is working. Asset pages will be added next.
      </p>

      {error && <p className="notice error" role="alert">{error}</p>}

      <button type="button" onClick={onSignOut} disabled={signingOut}>
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </section>
  )
}