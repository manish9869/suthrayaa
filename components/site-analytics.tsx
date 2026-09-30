'use client'

import { useReportWebVitals } from 'next/web-vitals'
import { analytics } from '@/lib/analytics'
import { useCallback, useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

// Storefront analytics, configured in Admin → Site Settings → Analytics & Tracking (Google
// Analytics 4, Google Tag Manager, Meta Pixel) and gated by the optional cookie-consent banner
// (Site Settings → Legal). Never loads on the admin console.

type Gtag = (...args: unknown[]) => void
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
    fbq?: (...args: unknown[]) => void
  }
}

const CONSENT_KEY = 'suthrayaa.cookie-consent'
type Consent = 'accepted' | 'declined' | null

function readConsent(): Consent {
  try {
    const v = localStorage.getItem(CONSENT_KEY)
    return v === 'accepted' || v === 'declined' ? v : null
  } catch {
    return null
  }
}

export interface SiteAnalyticsProps {
  gaId?: string
  gtmId?: string
  pixelId?: string
  consentRequired: boolean
  consentMessage?: string
}

const ID = {
  ga: /^G-[A-Z0-9]{4,}$/i,
  gtm: /^GTM-[A-Z0-9]{4,}$/i,
  pixel: /^\d{6,20}$/,
}

export function SiteAnalytics({ gaId, gtmId, pixelId, consentRequired, consentMessage }: SiteAnalyticsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAdmin = pathname?.startsWith('/admin') ?? false
  const [consent, setConsent] = useState<Consent>(null)
  const [consentLoaded, setConsentLoaded] = useState(false)

  useEffect(() => {
    setConsent(readConsent())
    setConsentLoaded(true)
  }, [])

  // Only well-formed IDs are ever injected into a script
  const ga = gaId && ID.ga.test(gaId.trim()) ? gaId.trim() : undefined
  const gtm = gtmId && ID.gtm.test(gtmId.trim()) ? gtmId.trim() : undefined
  const pixel = pixelId && ID.pixel.test(pixelId.trim()) ? pixelId.trim() : undefined
  const anyTracker = Boolean(ga || gtm || pixel)
  const allowed = consentLoaded && (!consentRequired || consent === 'accepted')
  const load = anyTracker && allowed && !isAdmin

  // A page view on first load and on every client-side route change. The tracker snippets run
  // "afterInteractive", so wait (briefly) for them to define gtag / fbq before reporting.
  useEffect(() => {
    if (!load) return
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    let tries = 0
    let timer: ReturnType<typeof setTimeout>
    const report = () => {
      const gaReady = !ga || typeof window.gtag === 'function'
      const pixelReady = !pixel || typeof window.fbq === 'function'
      if ((!gaReady || !pixelReady) && tries++ < 50) {
        timer = setTimeout(report, 100)
        return
      }
      if (ga) window.gtag?.('event', 'page_view', { page_path: url, page_location: window.location.href, page_title: document.title })
      if (pixel) window.fbq?.('track', 'PageView')
    }
    report()
    return () => clearTimeout(timer)
  }, [load, pathname, searchParams, ga, pixel])

  // Site speed from real visitors (Core Web Vitals) and script errors they hit — shown in
  // Admin → Insights → Pages & site speed. No-ops until the tracker has loaded.
  // a stable callback (web-vitals registers it once) that reads whether tracking is on from a ref
  const tracking = useRef(false)
  tracking.current = Boolean(load && ga)
  const reportVital = useCallback((m: { name: string; value: number; id: string; rating?: string }) => {
    if (tracking.current && ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].includes(m.name)) analytics.webVital(m.name, m.value, m.id, m.rating)
  }, [])
  useReportWebVitals(reportVital)
  useEffect(() => {
    if (!load || !ga) return
    let sent = 0
    const report = (msg: string) => {
      if (sent++ < 10 && msg) analytics.exception(msg)
    }
    const onError = (e: ErrorEvent) => report(e.message || 'Script error')
    const onRejection = (e: PromiseRejectionEvent) => report(e.reason instanceof Error ? e.reason.message : String(e.reason ?? 'Unhandled rejection'))
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [load, ga])

  const choose = (value: 'accepted' | 'declined') => {
    try {
      localStorage.setItem(CONSENT_KEY, value)
    } catch {}
    setConsent(value)
  }

  return (
    <>
      {load && ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${ga}',{send_page_view:false});`}
          </Script>
        </>
      )}
      {load && gtm && (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
        </Script>
      )}
      {load && pixel && (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');`}
        </Script>
      )}

      {consentRequired && consentLoaded && consent === null && !isAdmin && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-xl flex-col gap-3 rounded-2xl bg-card p-4 shadow-[0_20px_50px_-20px_color-mix(in_oklab,var(--shadow-tint)_45%,transparent)] ring-1 ring-border sm:flex-row sm:items-center"
        >
          <p className="flex-1 text-sm text-foreground/80">
            {consentMessage || 'We use cookies to improve your experience.'}{' '}
            <Link href="/privacy" className="text-primary underline underline-offset-2">
              Privacy policy
            </Link>
          </p>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" size="sm" onClick={() => choose('declined')}>
              Decline
            </Button>
            <Button size="sm" onClick={() => choose('accepted')}>
              Accept
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
