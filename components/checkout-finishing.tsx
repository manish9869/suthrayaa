'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LogoLoader } from '@/components/logo-loader'

const MESSAGES = {
  placing: ['Confirming your payment…', 'Securing your order…', 'Almost there…'],
  paid: ['Placing your order…', 'Telling our makers…', 'Almost there…'],
  pending: ['Saving your order…', 'Almost there…'],
}

/**
 * Full-screen hand-off between "Pay" and the thank-you page. Shown the moment the order is
 * placed / the payment is being verified, so the checkout never flashes an empty cart.
 */
export function CheckoutFinishing({ kind }: { kind: 'placing' | 'paid' | 'pending' }) {
  const lines = MESSAGES[kind]
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, lines.length - 1)), 1400)
    return () => clearInterval(t)
  }, [lines.length])

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm" role="status" aria-live="polite">
      <LogoLoader label={null} size={148} className="min-h-0" />
      <div className="mt-6 h-7 overflow-hidden text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={lines[i]}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="font-serif text-lg italic text-primary"
          >
            {lines[i]}
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Please don’t close or refresh this page.</p>
    </div>
  )
}
