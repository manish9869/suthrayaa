// Client-side auth session. The frontend never talks to Supabase: sign-in, refresh and sign-out
// all go through the backend's /api/auth gateway, and this module just holds the resulting
// session (Supabase-issued JWTs) in localStorage, refreshes it shortly before it expires, and
// keeps every tab in sync. Browser-only — call from client components / event handlers.

export interface AuthUser {
  id: string
  email: string | null
  phone: string | null
  firstName: string | null
  lastName: string | null
  /** Sign-in methods on the account, e.g. ["email"] or ["google"] */
  providers: string[]
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  /** Unix seconds */
  expiresAt: number
  user: AuthUser
}

const STORAGE_KEY = 'suthrayaa.session'
const REFRESH_MARGIN_S = 90
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'

type Listener = (session: AuthSession | null) => void
const listeners = new Set<Listener>()
let current: AuthSession | null | undefined // undefined = not read from storage yet
let refreshing: Promise<AuthSession | null> | null = null

function read(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as AuthSession) : null
    return parsed?.accessToken && parsed.refreshToken && parsed.user ? parsed : null
  } catch {
    return null
  }
}

function emit() {
  for (const fn of listeners) fn(current ?? null)
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  if (current === undefined) current = read()
  return current
}

export function setSession(session: AuthSession | null) {
  current = session
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage unavailable (private mode) — the session still lives in memory for this tab
  }
  emit()
}

export function updateSessionUser(user: AuthUser) {
  const s = getSession()
  if (s) setSession({ ...s, user })
}

export function onSessionChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Another tab signed in / out / refreshed
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return
    current = read()
    emit()
  })
}

async function refresh(session: AuthSession): Promise<AuthSession | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
    if (!res.ok) {
      // Only an auth rejection ends the session; network blips keep it for the next try
      if (res.status === 401) setSession(null)
      return res.status === 401 ? null : session
    }
    const { session: next } = (await res.json()) as { session: AuthSession }
    setSession(next)
    return next
  } catch {
    return session
  }
}

/** A valid access token for API calls, refreshing it first if it's about to expire. */
export async function getAccessToken(): Promise<string | undefined> {
  const session = getSession()
  if (!session) return undefined
  if (session.expiresAt - Date.now() / 1000 > REFRESH_MARGIN_S) return session.accessToken
  refreshing ??= refresh(session).finally(() => {
    refreshing = null
  })
  return (await refreshing)?.accessToken
}
