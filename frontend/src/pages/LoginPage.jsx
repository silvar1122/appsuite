import { useState } from 'react'
import '../App.css'

export default function LoginPage({ onSubmit, submitting, error }) {
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

                <a className="text-link" href="/forgot-password">
                    Forgot your password?
                </a>
            </form>
        </section>
    )
}