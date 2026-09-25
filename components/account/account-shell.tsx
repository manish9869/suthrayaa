'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Heart, LayoutGrid, LogOut, MapPin, Package, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { getProfile, type CustomerProfile } from '@/lib/api/account'
import { LogoLoader } from '@/components/logo-loader'
import { cn } from '@/lib/utils'

interface AccountContextValue {
  profile: CustomerProfile | null
  email: string | null
  refreshProfile: () => Promise<void>
  setProfile: (p: CustomerProfile) => void
}
const AccountContext = createContext<AccountContextValue | null>(null)
export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used inside the account area')
  return ctx
}

const NAV = [
  { href: '/account', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/account/orders', label: 'My orders', icon: Package },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/profile', label: 'Profile', icon: UserRound },
  { href: '/account/security', label: 'Password & security', icon: ShieldCheck },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
]

export const displayName = (p: CustomerProfile | null, email: string | null) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(' ') || email?.split('@')[0] || 'there'

/**
 * The signed-in customer area: sends guests to sign in (and back here afterwards), loads the
 * profile once for every page, and provides the account navigation — a sticky side menu on
 * desktop and a scrollable tab strip on phones.
 */
export function AccountShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
  }, [loading, user, pathname, router])

  const refreshProfile = useCallback(async () => {
    try {
      setProfile(await getProfile())
    } catch {
      setProfile(null)
    } finally {
      setProfileLoaded(true)
    }
  }, [])
  const userId = user?.id
  useEffect(() => {
    if (userId) refreshProfile()
  }, [userId, refreshProfile])

  if (loading || !user || !profileLoaded) {
    return <LogoLoader label="Opening your account…" />
  }

  const email = profile?.email ?? user.email ?? null
  const name = displayName(profile, email)
  const initials = (name.match(/\b\w/g) ?? ['S']).slice(0, 2).join('').toUpperCase()
  const isActive = (n: (typeof NAV)[number]) => (n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + '/'))

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <AccountContext.Provider value={{ profile, email, refreshProfile, setProfile }}>
      <div className="border-b bg-gradient-to-b from-primary/[0.07] to-transparent">
        <div className="container mx-auto flex items-center gap-4 px-4 py-7 sm:py-9">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary font-serif text-xl text-primary-foreground shadow-[0_10px_30px_-12px_rgb(109_74_255/0.7)] sm:h-16 sm:w-16 sm:text-2xl">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="eyebrow">My account</p>
            <h1 className="display truncate text-2xl sm:text-3xl">Hi, {profile?.firstName || name}</h1>
            {email && <p className="truncate text-sm text-muted-foreground">{email}</p>}
          </div>
        </div>
      </div>

      <div className="container mx-auto grid grid-cols-1 gap-6 px-4 py-6 sm:py-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10">
        {/* nav */}
        <nav aria-label="Account" className="lg:sticky lg:top-28 lg:self-start">
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:rounded-3xl lg:border lg:bg-card lg:p-2.5 lg:shadow-sm [&::-webkit-scrollbar]:hidden">
            {NAV.map((n) => {
              const active = isActive(n)
              return (
                <li key={n.href} className="shrink-0">
                  <Link
                    href={n.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors lg:rounded-2xl lg:border-0 lg:px-3.5 lg:py-2.5',
                      active ? 'border-primary bg-primary text-primary-foreground lg:bg-primary/10 lg:text-primary' : 'bg-card text-foreground/75 hover:text-foreground lg:bg-transparent lg:hover:bg-muted'
                    )}
                  >
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </Link>
                </li>
              )
            })}
            <li className="shrink-0 lg:mt-1 lg:border-t lg:pt-1">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-full border bg-card px-4 py-2 text-sm font-medium text-foreground/75 transition-colors hover:text-destructive lg:rounded-2xl lg:border-0 lg:bg-transparent lg:px-3.5 lg:py-2.5 lg:hover:bg-destructive/5"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </li>
          </ul>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </AccountContext.Provider>
  )
}

/** Page heading used inside the account area. */
export function AccountPageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="display text-2xl sm:text-[28px]">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/** Friendly empty state (icon, title, text, action). */
export function EmptyBlock({ icon: Icon, title, text, action }: { icon: React.ElementType; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed bg-card px-6 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="mt-4 font-serif text-xl">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
