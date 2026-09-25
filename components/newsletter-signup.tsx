'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Reveal } from '@/components/motion/reveal'
import { subscribeToNewsletter } from '@/lib/api/contact'
import { ApiError } from '@/lib/api/http'

export const NEWSLETTER_DEFAULTS = {
  title: 'Join the Suthrayaa circle',
  text: 'New drops, maker stories and member-only offers — straight from our studio to your inbox. Get 10% off your first order.',
  success: "You're on the list! Welcome to the yarn family.",
}

/** The blush newsletter card — used in the footer and (optionally) as a homepage section.
 * Signups are stored server-side and listed in Admin → Newsletter. */
export function NewsletterSignup({
  title = NEWSLETTER_DEFAULTS.title,
  text = NEWSLETTER_DEFAULTS.text,
  successMessage = NEWSLETTER_DEFAULTS.success,
  source = 'footer',
}: {
  title?: string
  text?: string
  successMessage?: string
  source?: 'footer' | 'homepage'
}) {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }
    setSubmitting(true)
    try {
      await subscribeToNewsletter(email.trim(), source)
      setSubscribed(true)
      toast.success(successMessage)
      setEmail('')
    } catch (err) {
      toast.error(err instanceof ApiError && err.status === 429 ? 'Too many attempts — please try again in a bit.' : 'Could not subscribe right now. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Reveal className="relative overflow-hidden rounded-[2rem] bg-blush px-6 py-10 sm:px-10 lg:px-14">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-rose/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-sage/25 blur-2xl" />
      <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex items-start gap-5">
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground sm:flex">
            <Mail className="h-6 w-6" />
          </span>
          <div>
            <h3 className="display text-3xl sm:text-4xl">{title}</h3>
            {text && <p className="mt-2 max-w-md text-[15px] text-foreground/70">{text}</p>}
          </div>
        </div>
        <form onSubmit={handleSubscribe} className="flex w-full flex-col gap-2 rounded-full sm:flex-row sm:bg-card sm:p-1.5 sm:shadow-sm">
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 flex-1 border-0 px-5 shadow-none focus-visible:ring-0 sm:bg-transparent"
            aria-label="Email address"
          />
          <Button type="submit" size="lg" className="h-12 px-7" disabled={submitting}>
            <AnimatePresence mode="wait" initial={false}>
              {subscribed ? (
                <motion.span key="ok" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Subscribed
                </motion.span>
              ) : (
                <motion.span key="go" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center gap-1.5">
                  {submitting ? 'Subscribing…' : 'Subscribe'} {!submitting && <ArrowRight className="h-4 w-4" />}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </form>
      </div>
    </Reveal>
  )
}
