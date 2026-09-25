'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase re-emits the session (SIGNED_IN / TOKEN_REFRESHED) whenever the tab regains
      // focus, each time with a fresh user object. Keep the existing reference while it's the
      // same account, so consumers don't treat a token refresh as a new sign-in and reload.
      const next = session?.user ?? null
      setUser((prev) => (prev && next && prev.id === next.id ? prev : next))
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    setUser(null)
  }

  return { user, loading, signOut }
}
