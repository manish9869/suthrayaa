// Tiny module-level cache so formatPrice() (a plain sync function called from ~50 existing
// spots) can be settings-driven without becoming async. Populated best-effort by
// StoreSettingsLoader at the storefront root; until then (or if it never loads) the
// fallback below is used — which is already the correct India default, so behavior is
// identical to the pre-settings hardcoded implementation on a cold cache.

interface CachedStoreSettings {
  currency: string
  locale: string
  decimalPlaces: number
}

const FALLBACK: CachedStoreSettings = { currency: 'INR', locale: 'en-IN', decimalPlaces: 0 }

let cache: CachedStoreSettings | null = null

export function setCachedStoreSettings(next: Partial<CachedStoreSettings>) {
  cache = { ...FALLBACK, ...cache, ...next }
}

export function getCachedStoreSettings(): CachedStoreSettings {
  return cache ?? FALLBACK
}
