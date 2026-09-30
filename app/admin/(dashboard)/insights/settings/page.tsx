'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, CircleDashed, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { getInsightsStatus, type InsightsStatus } from '@/lib/api/insights'
import { cn } from '@/lib/utils'

const EVENTS: [string, string][] = [
  ['view_item_list / select_item', 'Product lists seen and clicked (homepage sections, shop, search)'],
  ['view_item', 'Product page opened'],
  ['add_to_cart / remove_from_cart / view_cart', 'Cart activity'],
  ['add_to_wishlist', 'Heart tapped'],
  ['begin_checkout / add_shipping_info / add_payment_info / purchase', 'Checkout steps and orders'],
  ['search / search_no_results', 'Searches, and searches that found nothing'],
  ['view_promotion / select_promotion', 'Homepage banners seen and clicked'],
  ['customize_open / customize_choose / customize_reset / customize_done', 'Customize window activity'],
  ['LCP / INP / CLS / FCP / TTFB', 'Site speed measured on visitors’ devices'],
  ['exception', 'Errors visitors ran into'],
  ['sign_up / login', 'Accounts'],
]

function Step({ done, title, children }: { done: boolean | null; title: string; children: React.ReactNode }) {
  const Icon = done === null ? CircleDashed : done ? CheckCircle2 : XCircle
  return (
    <li className="flex gap-3">
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', done === null ? 'text-muted-foreground' : done ? 'text-emerald-600' : 'text-amber-600')} />
      <div className="min-w-0 space-y-1 text-sm">
        <p className="font-medium">{title}</p>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </li>
  )
}

/** Connecting Google Analytics: where things stand and what to do next. */
export default function InsightsSetupPage() {
  const [status, setStatus] = useState<InsightsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const check = () => {
    setLoading(true)
    getInsightsStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }
  useEffect(check, [])

  return (
    <div className="space-y-4">
      <div className={cn(GLASS_PANEL, 'p-4 sm:p-5')}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Google Analytics setup</h2>
            <p className="text-xs text-muted-foreground">Sales numbers always come from your own orders. Google Analytics adds visitors, traffic sources, the shopping funnel and site speed.</p>
          </div>
          <Button variant="outline" size="sm" onClick={check} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Check connection
          </Button>
        </div>
        {status?.error && <p className="mb-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-900">{status.error}</p>}
        <ol className="space-y-4">
          <Step done={status ? status.tracking : null} title="1. The shop sends visits to Google Analytics">
            {status?.measurementId ? (
              <>
                Tracking ID <code className="rounded bg-muted px-1">{status.measurementId}</code> is set.{' '}
              </>
            ) : (
              'No tracking ID yet. '
            )}
            Change it in{' '}
            <Link href="/admin/settings" className="text-primary hover:underline">
              Settings → Analytics &amp; Tracking
            </Link>
            . Visitors are only tracked after they accept cookies.
          </Step>
          <Step done={status ? status.configured : null} title="2. Let the admin read your Google Analytics reports">
            <ol className="ml-4 list-decimal space-y-1">
              <li>
                In <a className="text-primary hover:underline" href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud</a>, create a project, turn on the <strong>Google Analytics Data API</strong>, and create a <strong>service account</strong> with a JSON key.
              </li>
              <li>
                In Google Analytics → Admin → <strong>Property access management</strong>, add the service account&apos;s email as a <strong>Viewer</strong>.
              </li>
              <li>
                Ask your developer to add three lines to the backend <code className="rounded bg-muted px-1">.env</code> and restart it: <code className="rounded bg-muted px-1">GA4_PROPERTY_ID</code> (the number in GA → Admin → Property details, not the G-… ID), <code className="rounded bg-muted px-1">GA4_CLIENT_EMAIL</code> and <code className="rounded bg-muted px-1">GA4_PRIVATE_KEY</code> from the JSON key.
              </li>
            </ol>
          </Step>
          <Step done={status ? status.connected : null} title="3. Connected">
            {status?.connected ? (
              <>
                Reading property <code className="rounded bg-muted px-1">{status.propertyId}</code>. New data can take up to a day to appear in Google Analytics reports; Real-time shows the last 30 minutes.
              </>
            ) : (
              'Once steps 1 and 2 are done, press “Check connection”.'
            )}
          </Step>
        </ol>
      </div>
      <div className={cn(GLASS_PANEL, 'p-4 sm:p-5')}>
        <h3 className="text-sm font-semibold">What the shop records</h3>
        <p className="mb-3 text-xs text-muted-foreground">These events feed the Insights pages. Nothing personal (names, emails, addresses) is sent to Google.</p>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {EVENTS.map(([e, d]) => (
            <div key={e}>
              <dt className="font-mono text-[11.5px] text-primary">{e}</dt>
              <dd className="text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
