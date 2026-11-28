function getCookie(name) {
    const prefix = `${name}=`
    const cookie = document.cookie
        .split('; ')
        .find((item) => item.startsWith(prefix))

    return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : ''
}

function errorMessage(response, data, fallback) {
    if (response.status === 429) {
        return 'Too many attempts. Please wait and try again.'
    }

    if (response.status === 422) {
        return Object.values(data?.errors ?? {}).flat()[0] ?? fallback
    }

    return data?.message ?? fallback
}

async function postJson(path, payload) {
    const csrfResponse = await fetch('/sanctum/csrf-cookie', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
    })

    const csrfToken = getCookie('XSRF-TOKEN')

    if (!csrfResponse.ok || !csrfToken) {
        throw new Error('Could not start a secure session. Please try again.')
    }

    const response = await fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => null)

    return { response, data }
}

async function getJson(path, fallback) {
    const response = await fetch(path, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
        throw new Error(errorMessage(response, data, fallback))
    }

    return data
}

async function patchJson(path, payload) {
    const csrfResponse = await fetch('/sanctum/csrf-cookie', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
    })

    const csrfToken = getCookie('XSRF-TOKEN')

    if (!csrfResponse.ok || !csrfToken) {
        throw new Error('Could not start a secure session. Please try again.')
    }

    const response = await fetch(path, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => null)

    return { response, data }
}

export async function getCurrentUser() {
    const response = await fetch('/api/user', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
    })

    if (response.status === 401) {
        //not authorized
        return null
    }

    const data = await response.json().catch(() => null)

    if (!response.ok) {
        throw new Error(data?.message ?? 'Could not load the current session.')
    }

    return data
}

export async function getAssets(page = 1) {
    const result = await getJson(
        `/api/assets?page=${encodeURIComponent(page)}`,
        'Could not load assets.',
    )

    if (!Array.isArray(result?.data) || !result?.meta) {
        throw new Error('The asset list response was invalid.')
    }

    return result
}

export async function createAsset(asset) {
    const { response, data } = await postJson('/api/assets', asset)

    if (!response.ok) {
        throw new Error(errorMessage(response, data, 'Could not register the asset.'))
    }

    if (!data?.data) {
        throw new Error('The asset response was invalid.')
    }

    return data.data
}

export async function getEmployees(page = 1) {
    const result = await getJson(
        `/api/employees?page=${encodeURIComponent(page)}`,
        'Could not load employees.',
    )

    if (!Array.isArray(result?.data) || !result?.meta) {
        throw new Error('The employee list response was invalid.')
    }

    return result
}

export async function assignAsset(assetId, employeeId) {
    const { response, data } = await postJson(
        `/api/assets/${encodeURIComponent(assetId)}/assignments`,
        { employee_id: employeeId },
    )

    if (!response.ok) {
        throw new Error(errorMessage(response, data, 'Could not assign the asset.'))
    }

    if (!data?.data) {
        throw new Error('The assignment response was invalid.')
    }

    return data.data
}

export async function returnAsset(assignmentId, returnReason) {
    const { response, data } = await patchJson(
        `/api/assignments/${encodeURIComponent(assignmentId)}/return`,
        { return_reason: returnReason },
    )

    if (!response.ok) {
        throw new Error(errorMessage(response, data, 'Could not return the asset.'))
    }

    if (!data?.data) {
        throw new Error('The return response was invalid.')
    }

    return data.data
}

export async function signIn(email, password) {
    const { response, data } = await postJson('/login', { email, password })

    if (response.status === 204 || data?.two_factor === true) {
        return { challengeRequired: true, user: null }
    }

    if (!response.ok) {
        throw new Error(errorMessage(response, data, 'Sign-in failed.'))
    }

    const user = await getCurrentUser()

    if (!user) {
        throw new Error('Sign-in did not establish a session. Please try again.')
    }

    return { challengeRequired: false, user }
}

async function completeTwoFactorChallenge(payload) {
    const { response, data } = await postJson('/two-factor-challenge', payload)

    if (response.redirected) {
        throw new Error('Your sign-in challenge expired. Please sign in again.')
    }

    if (response.status !== 204) {
        throw new Error(errorMessage(response, data, 'The authentication code was not accepted.'))
    }

    const user = await getCurrentUser()

    if (!user) {
        throw new Error('Authentication is still pending. Please try again.')
    }

    return user
}

export async function submitTwoFactorCode(code) {
    return completeTwoFactorChallenge({ code })
}

export async function submitTwoFactorRecoveryCode(recoveryCode) {
    return completeTwoFactorChallenge({ recovery_code: recoveryCode })
}

export async function signOut() {
    const { response, data } = await postJson('/logout', {})

    if (!response.ok) {
        throw new Error(errorMessage(response, data, 'Could not sign out.'))
    }
}

export async function confirmPassword(password) {
    const { response, data } = await postJson('/user/confirm-password', {
        password,
    })

    if (!response.ok) {
        throw new Error(errorMessage(response, data, 'Password confirmation failed.'))
    }
}

export async function enableTwoFactor() {
    const { response, data } = await postJson('/user/two-factor-authentication', {})

    if (!response.ok) {
        throw new Error(errorMessage(response, data, 'Could not start MFA setup.'))
    }
}

export async function getTwoFactorSetup() {
    const [qrData, secretData] = await Promise.all([
        getJson('/user/two-factor-qr-code', 'Could not load the QR code.'),
        getJson('/user/two-factor-secret-key', 'Could not load the manual setup key.'),
    ])

    if (!qrData?.svg || !secretData?.secretKey) {
        throw new Error('MFA setup details are unavailable. Please try again.')
    }

    return {
        qrSvg: qrData.svg,
        secretKey: secretData.secretKey,
    }
}

export async function confirmTwoFactor(code) {
    const { response, data } = await postJson(
        '/user/confirmed-two-factor-authentication',
        { code },
    )

    if (!response.ok) {
        throw new Error(errorMessage(response, data, 'The authentication code was not accepted.'))
    }
}

export async function getRecoveryCodes() {
    const codes = await getJson(
        '/user/two-factor-recovery-codes',
        'Could not load recovery codes.',
    )

    if (!Array.isArray(codes)) {
        throw new Error('Recovery codes are unavailable. Please try again.')
    }

    return codes
}

export async function requestPasswordReset(email) {
    const { response, data } = await postJson('/forgot-password', { email })

    if (!response.ok) {
        throw new Error(errorMessage(response, data, 'Could not request a password reset.'))
    }

    return data?.status ?? 'If the address is registered, a password reset email will be sent.'
}