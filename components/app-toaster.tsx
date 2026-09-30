'use client'

import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'

/**
 * Toast alerts: bottom-right on desktop; on phones they drop in from the top, so they never
 * cover the sticky buy / checkout bars at the bottom of the screen.
 */
export function AppToaster() {
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const update = () => setPhone(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return <Toaster position={phone ? 'top-center' : 'bottom-right'} richColors closeButton mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }} />
}
