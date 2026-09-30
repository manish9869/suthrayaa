'use client'

import type { Product } from './data'

/**
 * GA4 ecommerce events for the storefront (https://developers.google.com/analytics/devguides/collection/ga4/ecommerce).
 *
 * Tracking only happens where <SiteAnalytics> has loaded a tracker — a Measurement ID / GTM
 * container is configured, the visitor has consented, and it's not the admin console. Until
 * then every call is a no-op, so call sites never need to check.
 *
 * Privacy: events carry product and money data only — never names, emails, phone numbers,
 * addresses, payment details or free text a customer typed (custom names on products).
 */

export interface AnalyticsItem {
  item_id: string
  item_name: string
  item_category?: string
  item_variant?: string
  price: number
  quantity: number
  index?: number
  item_list_name?: string
}

type EventParams = Record<string, unknown>

const CURRENCY = 'INR'

function send(event: string, params: EventParams) {
  if (typeof window === 'undefined') return
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', event, params)
    } else if (Array.isArray(window.dataLayer)) {
      // Google Tag Manager only: the standard GTM ecommerce shape (clear the previous object first)
      if ('items' in params) window.dataLayer.push({ ecommerce: null })
      window.dataLayer.push({ event, ecommerce: params })
    }
  } catch {
    // Analytics must never break the shop
  }
}

/** A cart-style line (or a bare product) as a GA4 item. `variant` should be colour / option names only. */
export function toItem(product: Pick<Product, 'id' | 'sku' | 'name' | 'category' | 'price'>, opts: { quantity?: number; variant?: string; price?: number; index?: number; list?: string } = {}): AnalyticsItem {
  return {
    item_id: product.sku || product.id,
    item_name: product.name,
    item_category: product.category || undefined,
    item_variant: opts.variant || undefined,
    price: Math.round((opts.price ?? product.price) * 100) / 100,
    quantity: opts.quantity ?? 1,
    index: opts.index,
    item_list_name: opts.list,
  }
}

const value = (items: AnalyticsItem[]) => Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100

export const analytics = {
  viewItem: (item: AnalyticsItem) => send('view_item', { currency: CURRENCY, value: item.price, items: [item] }),
  viewItemList: (listName: string, items: AnalyticsItem[]) =>
    items.length && send('view_item_list', { item_list_name: listName, items: items.slice(0, 50).map((i, index) => ({ ...i, index, item_list_name: listName })) }),
  selectItem: (listName: string, item: AnalyticsItem) => send('select_item', { item_list_name: listName, items: [{ ...item, item_list_name: listName }] }),
  addToCart: (item: AnalyticsItem) => send('add_to_cart', { currency: CURRENCY, value: value([item]), items: [item] }),
  removeFromCart: (item: AnalyticsItem) => send('remove_from_cart', { currency: CURRENCY, value: value([item]), items: [item] }),
  addToWishlist: (item: AnalyticsItem) => send('add_to_wishlist', { currency: CURRENCY, value: item.price, items: [item] }),
  viewCart: (items: AnalyticsItem[]) => items.length && send('view_cart', { currency: CURRENCY, value: value(items), items }),
  beginCheckout: (items: AnalyticsItem[], coupon?: string) => items.length && send('begin_checkout', { currency: CURRENCY, value: value(items), coupon, items }),
  /** `shippingTier`: "standard" / "express" — never the address itself. */
  addShippingInfo: (items: AnalyticsItem[], shippingTier: string, coupon?: string) =>
    send('add_shipping_info', { currency: CURRENCY, value: value(items), shipping_tier: shippingTier, coupon, items }),
  addPaymentInfo: (items: AnalyticsItem[], paymentType: string, coupon?: string) =>
    send('add_payment_info', { currency: CURRENCY, value: value(items), payment_type: paymentType, coupon, items }),
  /** Sent once per order number — a refresh or back-navigation to the success page won't count it twice. */
  purchase: (order: { transactionId: string; value: number; tax?: number; shipping?: number; coupon?: string; items: AnalyticsItem[] }) => {
    const key = `suthrayaa.ga-purchase.${order.transactionId}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // storage unavailable — still report once for this page view
    }
    send('purchase', {
      transaction_id: order.transactionId,
      currency: CURRENCY,
      value: order.value,
      tax: order.tax ?? 0,
      shipping: order.shipping ?? 0,
      coupon: order.coupon,
      items: order.items,
    })
  },
  search: (term: string) => term.trim() && send('search', { search_term: term.trim().slice(0, 100) }),
  /** A search that found nothing — the words shoppers want and the shop doesn't have. */
  searchNoResults: (term: string) => term.trim() && send('search_no_results', { search_term: term.trim().slice(0, 100) }),
  /** Homepage banners: `name` is the banner's title (a promotion, not a product). */
  viewPromotion: (name: string, slot: number) => send('view_promotion', { promotion_name: name.slice(0, 100), creative_slot: `hero_${slot + 1}`, items: [{ item_id: `promo-${slot + 1}`, item_name: name.slice(0, 100) }] }),
  selectPromotion: (name: string, slot: number) => send('select_promotion', { promotion_name: name.slice(0, 100), creative_slot: `hero_${slot + 1}`, items: [{ item_id: `promo-${slot + 1}`, item_name: name.slice(0, 100) }] }),
  /** The Customize window: opened, an option picked (option label only), reset, finished. */
  customizeOpen: (productName: string) => send('customize_open', { product_name: productName }),
  customizeChoose: (productName: string, option: string) => send('customize_choose', { product_name: productName, option_name: option.slice(0, 60) }),
  customizeReset: (productName: string) => send('customize_reset', { product_name: productName }),
  customizeDone: (productName: string, choices: number) => send('customize_done', { product_name: productName, value: choices }),
  /** Core Web Vitals from real visitors — CLS is ×1000 so it's a whole number like the rest. */
  webVital: (name: string, value: number, id: string, rating?: string) =>
    send(name, { value: Math.round(name === 'CLS' ? value * 1000 : value), metric_id: id, metric_rating: rating, non_interaction: true }),
  /** A script error a visitor ran into (message only, trimmed). */
  exception: (description: string) => send('exception', { description: description.slice(0, 150), fatal: false }),
  signUp: (method: string) => send('sign_up', { method }),
  login: (method: string) => send('login', { method }),
}

/** Colour and chosen option names for a cart line — typed text (e.g. a name to crochet) is left out. */
export function variantOf(line: { selectedColor?: string; customizations?: { displayValue: string; valueId?: string }[] }) {
  const opts = (line.customizations ?? []).filter((c) => c.valueId).map((c) => c.displayValue)
  return [line.selectedColor, ...opts].filter(Boolean).join(' / ')
}
