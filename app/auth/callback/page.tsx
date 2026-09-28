'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogoLoader } from '@/components/logo-loader'
import { Button } from '@/components/ui/button'
import { fetchUser } from '@/lib/api/auth'
import { setSession } from '@/lib/auth/session'
import { safeRedirectPath } from '@/lib/utils'

/**
 * Landing page for every auth redirect: Google sign-in, "confirm your email", "reset your
 * password" and "confirm your new email" links. The backend's auth gateway points them here,
 * with the session in the URL fragment (never sent to any server). We store it and move on.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const query = new URLSearchParams(window.location.search)
    // Drop the tokens from the address bar / history straight away
    window.history.replaceState(null, '', window.location.pathname + window.location.search)

    const next = safeRedirectPath(query.get('next'))
    const failure = hash.get('error_description') || query.get('error_description')
    const accessToken = hash.get('access_token')
    const refreshToken = hash.get('refresh_token')

    if (failure || !accessToken || !refreshToken) {
      setError(failure ? failure.replace(/\+/g, ' ') : 'This link is invalid or has expired.')
      return
    }

    const expiresAt = Number(hash.get('expires_at')) || Math.floor(Date.now() / 1000) + (Number(hash.get('expires_in')) || 3600)
    fetchUser(accessToken)
      .then((user) => {
        setSession({ accessToken, refreshToken, expiresAt, user })
        if (hash.get('type') === 'recovery') {
          // Signed in with a recovery session — ask for the new password
          router.replace(`/login?mode=reset&redirect=${encodeURIComponent(next === '/login?mode=reset' ? '/' : next)}`)
        } else {
          router.replace(next)
        }
      })
      .catch(() => setError('We couldn’t complete sign-in. Please try again.'))
  }, [router])

  if (error) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="display text-3xl">Sign-in link problem</h1>
        <p className="max-w-sm text-muted-foreground">{error}</p>
        <Button asChild>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </main>
    )
  }
  return <LogoLoader fullScreen label="Signing you in…" />
}
