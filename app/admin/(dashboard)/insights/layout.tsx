'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { INSIGHTS_NAV } from '@/components/admin/insights/nav'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { PageHeader } from '@/components/admin/page-header'
import { InsightsControls } from '@/components/admin/insights/controls'
import { getInsightsAlertCount, getInsightsStatus, type InsightsStatus } from '@/lib/api/insights'
import { cn } from '@/lib/utils'

function Nav() {
  const pathname = usePathname()
  const params = useSearchParams()
  const router = useRouter()
  const [alertCount, setAlertCount] = useState<number | null>(null)
  useEffect(() => {
    getInsightsAlertCount()
      .then((r) => setAlertCount(r.count))
      .catch(() => setAlertCount(null))
  }, [])
  const current = pathname.replace(/^\/admin\/insights\/?/, '').split('/')[0] ?? ''
  const href = (id: string) => `/admin/insights${id ? `/${id}` : ''}${params.toString() ? `?${params.toString()}` : ''}`

  return (
    <>
      {/* phones: one menu */}
      <label className="block lg:hidden">
        <span className="sr-only">Insights page</span>
        <select value={current} onChange={(e) => router.push(href(e.target.value))} className="h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground">
          {INSIGHTS_NAV.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.label}
                  {it.id === 'alerts' && alertCount ? ` (${alertCount})` : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {/* desktop: sidebar */}
      <nav aria-label="Insights" className="hidden lg:block">
        <div className="sticky top-20 space-y-4">
          {INSIGHTS_NAV.map((g) => (
            <div key={g.group}>
              <p className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{g.group}</p>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = current === it.id
                  return (
                    <li key={it.id}>
                      <Link
                        href={href(it.id)}
                        aria-current={active ? 'page' : undefined}
                        className={cn('flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors', active ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
                      >
                        <it.icon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{it.label}</span>
                        {it.id === 'alerts' && alertCount ? <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">{alertCount}</span> : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </>
  )
}

function Header() {
  const pathname = usePathname()
  const [status, setStatus] = useState<InsightsStatus | null>(null)
  useEffect(() => {
    getInsightsStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
  }, [])
  const current = pathname.replace(/^\/admin\/insights\/?/, '').split('/')[0] ?? ''
  const noPeriod = current === 'settings' || current === 'realtime'
  return (
    <div className="space-y-4">
      <PageHeader
        title="Insights"
        description="Your shop's sales from your own orders, and how shoppers find and use the site from Google Analytics — side by side."
        badge={
          status && (
            <Link
              href="/admin/insights/settings"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
                status.connected ? 'bg-emerald-500/12 text-emerald-700' : 'bg-amber-500/15 text-amber-800'
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', status.connected ? 'bg-emerald-500' : 'bg-amber-500')} />
              {status.connected ? 'Google Analytics connected' : status.configured ? 'Google Analytics error' : 'Connect Google Analytics'}
            </Link>
          )
        }
      />
      {!noPeriod && <InsightsControls />}
    </div>
  )
}

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute permission="analytics.view">
      <Suspense fallback={null}>
        <div className="space-y-5">
          <Header />
          <div className="grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
            <Nav />
            <div className="min-w-0">{children}</div>
          </div>
        </div>
      </Suspense>
    </ProtectedRoute>
  )
}
