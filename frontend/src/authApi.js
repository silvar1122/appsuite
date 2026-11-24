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

export async function signIn(email, password) {
  const { response, data } = await postJson('/login', { email, password })

  if (response.status === 204) {
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

export async function submitTwoFactorCode(code) {
  const { response, data } = await postJson('/two-factor-challenge', { code })

  if (!response.ok) {
    throw new Error(errorMessage(response, data, 'The authentication code was not accepted.'))
  }

  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Authentication is still pending. Please try the code again.')
  }

  return user
}

export async function signOut() {
  const { response, data } = await postJson('/logout', {})

  if (!response.ok) {
    throw new Error(errorMessage(response, data, 'Could not sign out.'))
  }
}