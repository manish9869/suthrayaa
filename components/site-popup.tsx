'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, Copy, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { YarnBallIcon } from '@/components/motion/crochet-effects'
import { cn } from '@/lib/utils'

/**
 * The storefront pop-up alert, set up in Admin → Settings → Pop-up Alert: a message (a sale,
 * a holiday notice, a coupon) shown as a centred pop-up or a small corner card, on the pages,
 * dates and as often as the admin chose.
 */

export interface PopupConfig {
  title: string
  message: string
  imageUrl?: string
  buttonLabel?: string
  buttonLink?: string
  couponCode?: string
  style: 'modal' | 'corner'
  pages: 'all' | 'home' | 'shopping' | 'cart_checkout'
  frequency: 'once' | 'session' | 'always'
  delaySeconds: number
  startDate?: string
  endDate?: string
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** The pop-up from the public `popup` settings group, or null when it's off or empty. */
export function parsePopup(group: Record<string, unknown> | undefined, { ignoreSchedule = false } = {}): PopupConfig | null {
  if (!group || !group['popup.enabled']) return null
  const popup = popupFromValues(group)
  if (!popup.title && !popup.message) return null
  if (!ignoreSchedule && !isLive(popup)) return null
  return popup
}

/** Field values → config (no on/off or schedule checks — the admin preview uses this). */
export function popupFromValues(v: Record<string, unknown>): PopupConfig {
  const pick = <T extends string>(value: unknown, options: readonly T[], fallback: T): T => (options.includes(value as T) ? (value as T) : fallback)
  return {
    title: str(v['popup.title']),
    message: str(v['popup.message']),
    imageUrl: str(v['popup.image_url']) || undefined,
    buttonLabel: str(v['popup.button_label']) || undefined,
    buttonLink: str(v['popup.button_link']) || undefined,
    couponCode: str(v['popup.coupon_code']) || undefined,
    style: pick(v['popup.style'], ['modal', 'corner'] as const, 'modal'),
    pages: pick(v['popup.pages'], ['all', 'home', 'shopping', 'cart_checkout'] as const, 'all'),
    frequency: pick(v['popup.frequency'], ['once', 'session', 'always'] as const, 'session'),
    delaySeconds: Math.min(60, Math.max(0, Number(v['popup.delay_seconds']) || 0)),
    startDate: str(v['popup.start_date']) || undefined,
    endDate: str(v['popup.end_date']) || undefined,
  }
}

export function isLive(p: Pick<PopupConfig, 'startDate' | 'endDate'>, now = new Date()): boolean {
  const start = p.startDate ? new Date(p.startDate) : null
  const end = p.endDate ? new Date(p.endDate) : null
  if (start && !Number.isNaN(start.getTime()) && now < start) return false
  if (end && !Number.isNaN(end.getTime()) && now > end) return false
  return true
}

/** Whether the pop-up belongs on this page. Payment and sign-in pages are never interrupted,
 * except checkout when the admin targets cart & checkout on purpose. */
export function showsOn(pages: PopupConfig['pages'], pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path.startsWith('/admin') || path.startsWith('/order-confirmation') || path.startsWith('/login') || path.startsWith('/auth')) return false
  switch (pages) {
    case 'home':
      return path === '/'
    case 'shopping':
      return path === '/' || path === '/shop' || path.startsWith('/product/')
    case 'cart_checkout':
      return path === '/cart' || path === '/checkout'
    default:
      return path !== '/checkout'
  }
}

/** A fingerprint of the content: editing the pop-up shows it again to people who closed it. */
export function popupKey(p: PopupConfig): string {
  const text = [p.title, p.message, p.imageUrl, p.buttonLabel, p.buttonLink, p.couponCode].join('|')
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return `suthrayaa-popup:${(h >>> 0).toString(36)}`
}

function seen(p: PopupConfig): boolean {
  try {
    if (p.frequency === 'once') return localStorage.getItem(popupKey(p)) === '1'
    if (p.frequency === 'session') return sessionStorage.getItem(popupKey(p)) === '1'
  } catch {
    // storage blocked — fall through and show it
  }
  return false
}

function markSeen(p: PopupConfig) {
  try {
    if (p.frequency === 'once') localStorage.setItem(popupKey(p), '1')
    if (p.frequency === 'session') sessionStorage.setItem(popupKey(p), '1')
  } catch {
    // storage blocked — it may show again, which is harmless
  }
}

/** The pop-up's content — shared by the storefront and the admin's live preview. */
export function PopupBody({ popup, onAction, compact = false }: { popup: PopupConfig; onAction?: () => void; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    if (!popup.couponCode) return
    try {
      await navigator.clipboard.writeText(popup.couponCode)
      setCopied(true)
      toast.success(`Code ${popup.couponCode} copied — use it at checkout`)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.info(`Your code: ${popup.couponCode}`)
    }
  }
  const external = popup.buttonLink ? /^https?:\/\//i.test(popup.buttonLink) : false
  return (
    <div className="relative">
      {popup.imageUrl ? (
        <div className={cn('relative overflow-hidden bg-sand', compact ? 'aspect-[16/9] rounded-t-[1.4rem]' : 'aspect-[16/10] rounded-t-[1.6rem]')}>
          <Image src={popup.imageUrl} alt="" fill sizes="440px" className="object-cover" />
        </div>
      ) : (
        <div className={cn('flex justify-center', compact ? 'pt-5' : 'pt-7')}>
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-blush">
            <span className="stitch-ring absolute inset-1 rounded-full" aria-hidden />
            <YarnBallIcon className="h-7 w-7 text-primary" />
          </span>
        </div>
      )}
      <div className={cn('text-center', compact ? 'px-5 pb-5 pt-4' : 'px-7 pb-7 pt-5')}>
        {popup.title && <p className={cn('display text-balance', compact ? 'text-xl' : 'text-[1.7rem] leading-tight')}>{popup.title}</p>}
        {popup.message && <p className={cn('mx-auto mt-2 max-w-sm whitespace-pre-line text-pretty text-foreground/70', compact ? 'text-sm' : 'text-[15px]')}>{popup.message}</p>}
        {popup.couponCode && (
          <button
            type="button"
            onClick={copy}
            className="mx-auto mt-4 flex items-center gap-2 rounded-full border-2 border-dashed border-primary/40 bg-primary/5 py-1.5 pl-4 pr-3 font-mono text-sm font-semibold tracking-wider text-primary transition-colors hover:bg-primary/10"
            aria-label={`Copy code ${popup.couponCode}`}
          >
            {popup.couponCode}
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4 opacity-70" />}
          </button>
        )}
        {popup.buttonLabel && popup.buttonLink && (
          <Button asChild size={compact ? 'default' : 'lg'} className={cn('group mt-5', compact ? 'h-10 w-full' : 'h-12 w-full')}>
            <Link href={popup.buttonLink} onClick={onAction} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {popup.buttonLabel} <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

/** Shows the admin's pop-up on the storefront when it applies to this visitor and page. */
export function SitePopup({ popup }: { popup: PopupConfig | null }) {
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [closedHere, setClosedHere] = useState(false)

  useEffect(() => {
    setOpen(false)
    // ?popup-preview=1 (the admin's "Open the shop" link) shows it even if already closed
    const preview = new URLSearchParams(window.location.search).has('popup-preview')
    if (!popup || closedHere || (!preview && (!showsOn(popup.pages, pathname) || seen(popup)))) return
    const t = setTimeout(() => setOpen(true), popup.delaySeconds * 1000)
    return () => clearTimeout(t)
  }, [popup, pathname, closedHere])

  if (!popup) return null
  const close = () => {
    markSeen(popup)
    setOpen(false)
    setClosedHere(true)
  }

  if (popup.style === 'modal') {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[440px] gap-0 overflow-hidden rounded-[1.6rem] border-0 p-0 shadow-2xl">
          <DialogTitle className="sr-only">{popup.title || 'Message from Suthrayaa'}</DialogTitle>
          <DialogDescription className="sr-only">{popup.message}</DialogDescription>
          <PopupBody popup={popup} onAction={close} />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          role="status"
          aria-live="polite"
          aria-label={popup.title || 'Message from Suthrayaa'}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm overflow-hidden rounded-[1.4rem] bg-card shadow-[0_24px_60px_-20px_rgb(31_26_51/0.45)] ring-1 ring-border sm:left-5 sm:right-auto sm:mx-0 sm:w-[340px]"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card/85 text-foreground/70 backdrop-blur transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <PopupBody popup={popup} onAction={close} compact />
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
