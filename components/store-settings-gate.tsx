'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getPublicSiteSettings } from '@/lib/api/settings'
import { setCachedStoreSettings } from '@/lib/store-settings-cache'
import { MaintenancePage } from './maintenance-page'

interface MaintenanceState {
  enabled: boolean
  title?: string
  message?: string
  imageUrl?: string
}

/** Warms the currency-formatting cache and gates the storefront behind a maintenance page
 * when enabled. Never gates /admin — an admin route match short-circuits before maintenance
 * is even checked, so admins can always sign in and turn maintenance back off. */
export function StoreSettingsGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [maintenance, setMaintenance] = useState<MaintenanceState | null>(null)

  useEffect(() => {
    getPublicSiteSettings()
      .then((settings) => {
        const general = settings.general ?? {}
        setCachedStoreSettings({
          currency: (general['store.currency'] as string) ?? 'INR',
          locale: (general['store.locale'] as string) ?? 'en-IN',
          decimalPlaces: Number(general['store.decimal_places'] ?? 0),
        })

        const m = settings.maintenance ?? {}
        setMaintenance({
          enabled: Boolean(m['maintenance.enabled']),
          title: m['maintenance.title'] as string | undefined,
          message: m['maintenance.message'] as string | undefined,
          imageUrl: m['maintenance.image_url'] as string | undefined,
        })
      })
      .catch(() => setMaintenance({ enabled: false }))
  }, [])

  const isAdminRoute = pathname?.startsWith('/admin')
  if (!isAdminRoute && maintenance?.enabled) {
    return <MaintenancePage title={maintenance.title} message={maintenance.message} imageUrl={maintenance.imageUrl} />
  }

  return <>{children}</>
}
