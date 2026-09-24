'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight, Copy, Check, Gift, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/motion/reveal'
import { formatPrice, type Product } from '@/lib/data'
import { STOREFRONT_IMAGES } from '@/lib/storefront-images'
import { STOREFRONT_PROMO } from '@/lib/storefront-content'
import { toast } from 'sonner'

function useCountdownToMidnight() {
  const [left, setLeft] = useState<{ h: number; m: number; s: number } | null>(null)
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const end = new Date(now)
      end.setHours(24, 0, 0, 0)
      const diff = Math.max(0, end.getTime() - now.getTime())
      setLeft({ h: Math.floor(diff / 3.6e6), m: Math.floor((diff % 3.6e6) / 6e4), s: Math.floor((diff % 6e4) / 1000) })
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])
  return left
}

/** Rolls a digit pair vertically when it changes (numbers slide, they don't just swap). */
function TimeUnit({ value, label }: { value: number | undefined; label: string }) {
  const reduce = useReducedMotion()
  const text = value == null ? '--' : String(value).padStart(2, '0')
  return (
    <div className="flex w-16 flex-col items-center rounded-2xl bg-card py-2.5 shadow-sm ring-1 ring-border">
      <span className="relative h-8 overflow-hidden font-serif text-[1.7rem] font-medium tabular-nums leading-8">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            className="block"
            initial={reduce ? { opacity: 0 } : { y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: '-100%', opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
    </div>
  )
}

export function PromoSection({ products = [] }: { products?: Product[] }) {
  const left = useCountdownToMidnight()
  const [copied, setCopied] = useState(false)
  const deal = products.find((p) => p.comparePrice && p.comparePrice > p.price) ?? products[0]
  const dealDiscount = deal?.comparePrice ? Math.round(((deal.comparePrice - deal.price) / deal.comparePrice) * 100) : 0

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(STOREFRONT_PROMO.couponCode)
      setCopied(true)
      toast.success(`Code ${STOREFRONT_PROMO.couponCode} copied`)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('Could not copy the code')
    }
  }

  return (
    <section className="py-8 lg:py-12">
      <div className="container mx-auto space-y-5 px-4">
        {/* Sale banner */}
        <Reveal className="group relative grid overflow-hidden rounded-[2rem] bg-primary text-primary-foreground lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative z-10 flex flex-col justify-center gap-5 p-8 sm:p-12">
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
              <Sparkles className="h-4 w-4" /> {STOREFRONT_PROMO.saleEyebrow}
            </p>
            <h3 className="display text-4xl sm:text-5xl">{STOREFRONT_PROMO.saleTitle}</h3>
            <p className="max-w-sm text-[15px] text-primary-foreground/75">{STOREFRONT_PROMO.saleText}</p>
            <Button asChild size="lg" className="group/btn h-12 w-fit bg-blush px-6 text-foreground hover:bg-blush/90">
              <Link href={STOREFRONT_PROMO.saleHref}>
                Explore deals <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </Link>
            </Button>
          </div>
          <div className="relative min-h-[240px] lg:min-h-[340px]">
            <Image src={STOREFRONT_IMAGES.promoBanner} alt="" fill sizes="(max-width: 1024px) 100vw, 55vw" className="zoom-img object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/10 to-transparent lg:via-transparent" />
            <div className="absolute left-6 top-1/2 flex h-32 w-32 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-rose text-center text-white shadow-xl lg:-left-16 lg:h-36 lg:w-36">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-90">Up to</span>
              <span className="display text-4xl">{STOREFRONT_PROMO.saleBadge.replace(/\D+/g, '')}%</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-90">off</span>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Coupon */}
          <Reveal delay={0.05} className="relative overflow-hidden rounded-[2rem] bg-blush p-8 sm:p-10">
            <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-rose/20 blur-2xl" />
            <div className="relative flex items-start justify-between gap-6">
              <div>
                <p className="eyebrow">Exclusive for you</p>
                <h3 className="display mt-3 text-3xl sm:text-4xl">{STOREFRONT_PROMO.couponTitle}</h3>
                <p className="mt-2 max-w-xs text-sm text-foreground/70">{STOREFRONT_PROMO.couponText}</p>
              </div>
              <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-card text-rose shadow-sm sm:flex float-slow">
                <Gift className="h-7 w-7" />
              </span>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="tap-bounce relative mt-7 flex w-full max-w-sm items-center justify-between rounded-2xl border-2 border-dashed border-rose/50 bg-card px-5 py-3.5 text-left"
            >
              <span>
                <span className="block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Use code</span>
                <span className="font-mono text-lg font-semibold tracking-[0.12em]">{STOREFRONT_PROMO.couponCode}</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
              </span>
            </button>
          </Reveal>

          {/* Deal of the day */}
          <Reveal delay={0.1} className="relative overflow-hidden rounded-[2rem] bg-accent p-8 sm:p-10">
            <div className="grid items-center gap-6 sm:grid-cols-[1fr_190px]">
              <div>
                <p className="eyebrow !text-primary">Deal of the day</p>
                <h3 className="display mt-3 text-3xl sm:text-4xl">{deal ? deal.name : 'Today’s pick'}</h3>
                {deal && (
                  <p className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-semibold">{formatPrice(deal.price)}</span>
                    {deal.comparePrice && <span className="text-sm text-muted-foreground line-through">{formatPrice(deal.comparePrice)}</span>}
                    {dealDiscount > 0 && <span className="rounded-full bg-rose px-2 py-0.5 text-[11px] font-semibold text-white">−{dealDiscount}%</span>}
                  </p>
                )}
                <p className="mt-4 text-xs font-medium text-muted-foreground">Hurry — ends at midnight</p>
                <div className="mt-2 flex gap-2">
                  <TimeUnit value={left?.h} label="Hrs" />
                  <TimeUnit value={left?.m} label="Mins" />
                  <TimeUnit value={left?.s} label="Secs" />
                </div>
                <Button asChild className="group/btn mt-6 h-11 px-6">
                  <Link href={deal ? `/product/${deal.slug}` : '/shop'}>
                    Shop the deal <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </Link>
                </Button>
              </div>
              <Link href={deal ? `/product/${deal.slug}` : '/shop'} className="group relative mx-auto block aspect-square w-full max-w-[220px] overflow-hidden rounded-full bg-card ring-8 ring-card/60">
                <Image src={deal?.images[0] ?? STOREFRONT_IMAGES.dealOfDay} alt={deal?.name ?? ''} fill sizes="220px" className="zoom-img object-cover" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
