import { useState } from 'react'
import '../App.css'

export default function TwoFactorChallengePage({
    onSubmit,
    onBack,
    onMethodChange,
    submitting,
    error,
}) {
    const [useRecoveryCode, setUseRecoveryCode] = useState(false)
    const [credential, setCredential] = useState('')

    const canSubmit = useRecoveryCode
        ? credential.trim().length > 0
        : /^[0-9]{6}$/.test(credential)

    async function handleSubmit(event) {
        event.preventDefault()

        const method = useRecoveryCode ? 'recovery' : 'authenticator'
        const succeeded = await onSubmit(credential.trim(), method)

        if (succeeded) setCredential('')
    }

    function toggleMethod() {
        setCredential('')
        onMethodChange()
        setUseRecoveryCode((current) => !current)
    }

    return (
        <section className="form-card">
            <h1>Verify your sign-in</h1>
            <p className="intro">
                {useRecoveryCode
                    ? 'Enter one of the recovery codes you saved during MFA setup.'
                    : 'Enter the current six-digit code from your authenticator app.'}
            </p>

            <form onSubmit={handleSubmit}>
                <label className="field">
                    <span>{useRecoveryCode ? 'Recovery code' : 'Authentication code'}</span>
                    <input
                        type="text"
                        inputMode={useRecoveryCode ? 'text' : 'numeric'}
                        autoComplete={useRecoveryCode ? 'off' : 'one-time-code'}
                        pattern={useRecoveryCode ? undefined : '[0-9]{6}'}
                        maxLength={useRecoveryCode ? undefined : 6}
                        value={credential}
                        onChange={(event) => setCredential(event.target.value)}
                        required
                    />
                </label>

                {error && <p className="notice error" role="alert">{error}</p>}

                <button type="submit" disabled={submitting || !canSubmit}>
                    {submitting ? 'Verifying…' : 'Verify'}
                </button>
            </form>

            <button
                type="button"
                className="secondary-button"
                onClick={toggleMethod}
                disabled={submitting}
            >
                {useRecoveryCode ? 'Use authenticator app instead' : 'Use a recovery code instead'}
            </button>

            <button
                type="button"
                className="secondary-button"
                onClick={onBack}
                disabled={submitting}
            >
                Back to sign in
            </button>
        </section>
    )
}