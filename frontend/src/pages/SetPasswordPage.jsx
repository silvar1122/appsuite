import { useState } from 'react'
import '../App.css'

function getCookie(name) {
    const prefix = `${name}=`
    const cookie = document.cookie
        .split('; ')
        .find((item) => item.startsWith(prefix))

    return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : ''
}

export default function SetPasswordPage() {
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
                <a href="/" className="text-link">Go to sign in</a>
            </section>
        )
    }

    return (
        <section className="form-card">
            <h1>Set your password</h1>
            <p className="intro">Choose a password to activate your account.</p>

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

                {error && <p className="notice error" role="alert">{error}</p>}

                <button type="submit" disabled={submitting}>
                    {submitting ? 'Setting password…' : 'Set password'}
                </button>
            </form>
        </section>
    )
}