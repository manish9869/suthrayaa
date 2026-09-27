import { apiFetch } from './http'
import { getAccessToken, getSession, setSession, type AuthSession, type AuthUser } from '@/lib/auth/session'

// Auth goes through the backend gateway (/api/auth) — see lib/auth/session.ts.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'

export async function signIn(email: string, password: string) {
  const { session } = await apiFetch<{ session: AuthSession }>('/auth/login', {
    method: 'POST',
    revalidate: false,
    body: JSON.stringify({ email, password }),
  })
  setSession(session)
  return session
}

/** Returns true when the account still needs its email confirmed before it can sign in. */
export async function signUp(input: { email: string; password: string; firstName: string; lastName: string; next?: string }) {
  const { session, needsConfirmation } = await apiFetch<{ session: AuthSession | null; needsConfirmation: boolean }>('/auth/signup', {
    method: 'POST',
    revalidate: false,
    body: JSON.stringify(input),
  })
  if (session) setSession(session)
  return { needsConfirmation }
}

/** Signs out this device ("local") or every other device ("others"). */
export async function signOut(scope: 'local' | 'others' = 'local') {
  const token = await getAccessToken()
  if (token) {
    await apiFetch<void>('/auth/logout', { method: 'POST', revalidate: false, token, body: JSON.stringify({ scope }) }).catch(() => {
      // Even if the server call fails, a local sign-out must still clear this device
      if (scope !== 'local') throw new Error('Could not sign out other devices')
    })
  }
  if (scope === 'local') setSession(null)
}

export const requestPasswordReset = (email: string) =>
  apiFetch<{ ok: true }>('/auth/forgot-password', { method: 'POST', revalidate: false, body: JSON.stringify({ email }) })

/** Omit `currentPassword` only for a password-recovery session (from the reset email). */
export async function changePassword(password: string, currentPassword?: string) {
  return apiFetch<{ ok: true }>('/auth/password', {
    method: 'POST',
    revalidate: false,
    token: await getAccessToken(),
    body: JSON.stringify({ password, ...(currentPassword !== undefined ? { currentPassword } : {}) }),
  })
}

export async function changeEmail(email: string) {
  return apiFetch<{ ok: true }>('/auth/email', { method: 'POST', revalidate: false, token: await getAccessToken(), body: JSON.stringify({ email }) })
}

/** Loads the user for a freshly issued token (after an email link or Google redirect). */
export const fetchUser = (accessToken: string) =>
  apiFetch<{ user: AuthUser }>('/auth/user', { revalidate: false, token: accessToken }).then((r) => r.user)

/** Full-page redirect into Google sign-in (via the backend); returns to `next` afterwards. */
export function googleSignInUrl(next: string) {
  return `${API_URL}/auth/oauth/google?next=${encodeURIComponent(next)}`
}

export { getSession }
