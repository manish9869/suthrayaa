import { describe, expect, it } from 'vitest'
import { isLive, parsePopup, popupKey, showsOn } from '@/components/site-popup'

const base = { 'popup.enabled': true, 'popup.title': 'Diwali sale', 'popup.message': '20% off' }

describe('site pop-up', () => {
  it('is off when disabled or empty', () => {
    expect(parsePopup(undefined)).toBeNull()
    expect(parsePopup({ ...base, 'popup.enabled': false })).toBeNull()
    expect(parsePopup({ 'popup.enabled': true, 'popup.title': ' ', 'popup.message': '' })).toBeNull()
    expect(parsePopup(base)?.title).toBe('Diwali sale')
  })

  it('falls back to safe defaults for unknown options', () => {
    const p = parsePopup({ ...base, 'popup.style': 'weird', 'popup.pages': 'x', 'popup.frequency': 'y', 'popup.delay_seconds': 999 })!
    expect(p).toMatchObject({ style: 'modal', pages: 'all', frequency: 'session', delaySeconds: 60 })
  })

  it('respects the start and end dates', () => {
    const now = new Date('2026-10-10T12:00:00')
    expect(isLive({ startDate: '2026-10-11T00:00' }, now)).toBe(false)
    expect(isLive({ endDate: '2026-10-09T00:00' }, now)).toBe(false)
    expect(isLive({ startDate: '2026-10-01T00:00', endDate: '2026-10-20T00:00' }, now)).toBe(true)
    expect(isLive({ startDate: 'not a date' }, now)).toBe(true)
    expect(parsePopup({ ...base, 'popup.end_date': '2000-01-01T00:00' })).toBeNull()
  })

  it('shows only on the chosen pages and never interrupts payment or sign-in', () => {
    expect(showsOn('all', '/')).toBe(true)
    expect(showsOn('all', '/product/x')).toBe(true)
    expect(showsOn('all', '/checkout')).toBe(false)
    expect(showsOn('home', '/shop')).toBe(false)
    expect(showsOn('shopping', '/product/x')).toBe(true)
    expect(showsOn('shopping', '/cart')).toBe(false)
    expect(showsOn('cart_checkout', '/checkout')).toBe(true)
    for (const pages of ['all', 'home', 'shopping', 'cart_checkout'] as const) {
      expect(showsOn(pages, '/order-confirmation')).toBe(false)
      expect(showsOn(pages, '/login')).toBe(false)
      expect(showsOn(pages, '/admin/settings')).toBe(false)
    }
  })

  it('changes its "seen" key when the message changes', () => {
    const a = parsePopup(base)!
    const b = parsePopup({ ...base, 'popup.message': '25% off' })!
    expect(popupKey(a)).not.toBe(popupKey(b))
    expect(popupKey(a)).toBe(popupKey(parsePopup(base)!))
  })
})
