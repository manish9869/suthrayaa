import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from './data'
import { analytics, toItem, variantOf } from './analytics'

export interface CartCustomizationSelection {
  customizationId: string
  valueId?: string
  textValue?: string
  /** Display-only snapshot, not sent to the backend (which recomputes from IDs). */
  label: string
  displayValue: string
  priceAdjustment: number
}

export interface CartItem {
  product: Product
  quantity: number
  selectedColor: string
  customText?: string
  customizations?: CartCustomizationSelection[]
}

/** Stable key for a set of customization selections, used to tell cart lines apart. */
function customizationsKey(customizations?: CartCustomizationSelection[]): string {
  if (!customizations || customizations.length === 0) return ''
  return customizations
    .map((c) => `${c.customizationId}:${c.valueId ?? ''}:${c.textValue ?? ''}`)
    .sort()
    .join('|')
}

interface CartState {
  items: CartItem[]
  isOpen: boolean

  // Actions
  addItem: (
    product: Product,
    selectedColor: string,
    customText?: string,
    customizations?: CartCustomizationSelection[],
    /** How many to add (defaults to 1) — used by the product page's quantity picker. */
    quantity?: number
  ) => void
  removeItem: (productId: string, selectedColor: string, customText?: string, customizations?: CartCustomizationSelection[]) => void
  updateQuantity: (
    productId: string,
    selectedColor: string,
    quantity: number,
    customText?: string,
    customizations?: CartCustomizationSelection[]
  ) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void

  // Computed
  getTotalItems: () => number
  getTotalPrice: () => number
  getItemKey: (item: CartItem) => string
  getItemUnitPrice: (item: CartItem) => number
}

const getItemKey = (productId: string, selectedColor: string, customText?: string, customizations?: CartCustomizationSelection[]) => {
  return `${productId}-${selectedColor}-${customText || ''}-${customizationsKey(customizations)}`
}

const matches = (item: CartItem, productId: string, selectedColor: string, customText?: string, customizations?: CartCustomizationSelection[]) =>
  item.product.id === productId &&
  item.selectedColor === selectedColor &&
  item.customText === customText &&
  customizationsKey(item.customizations) === customizationsKey(customizations)

const unitPrice = (product: Product, customizations?: CartCustomizationSelection[]) =>
  product.price + (customizations ?? []).reduce((sum, c) => sum + c.priceAdjustment, 0)

/** GA4 event for `quantity` units of a cart line being added or removed. */
function trackCartChange(kind: 'add' | 'remove', item: Pick<CartItem, 'product' | 'selectedColor' | 'customizations'>, quantity: number) {
  if (quantity <= 0) return
  const ga = toItem(item.product, { quantity, variant: variantOf(item), price: unitPrice(item.product, item.customizations) })
  if (kind === 'add') analytics.addToCart(ga)
  else analytics.removeFromCart(ga)
}

/** The checkout API accepts up to 20 of one line. */
export const MAX_LINE_QTY = 20

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, selectedColor, customText, customizations, quantity = 1) => {
        const qty = Math.max(1, Math.floor(quantity))
        const before = get().items.find((item) => matches(item, product.id, selectedColor, customText, customizations))?.quantity ?? 0
        set((state) => {
          const existingIndex = state.items.findIndex((item) =>
            matches(item, product.id, selectedColor, customText, customizations)
          )

          if (existingIndex > -1) {
            const newItems = [...state.items]
            newItems[existingIndex] = { ...newItems[existingIndex], quantity: Math.min(MAX_LINE_QTY, newItems[existingIndex].quantity + qty) }
            return { items: newItems }
          }

          return {
            items: [...state.items, { product, quantity: Math.min(MAX_LINE_QTY, qty), selectedColor, customText, customizations }],
          }
        })
        trackCartChange('add', { product, selectedColor, customizations }, Math.min(MAX_LINE_QTY, before + qty) - before)
      },

      removeItem: (productId, selectedColor, customText, customizations) => {
        const line = get().items.find((item) => matches(item, productId, selectedColor, customText, customizations))
        if (line) trackCartChange('remove', line, line.quantity)
        set((state) => ({
          items: state.items.filter((item) => !matches(item, productId, selectedColor, customText, customizations)),
        }))
      },

      updateQuantity: (productId, selectedColor, quantity, customText, customizations) => {
        if (quantity <= 0) {
          get().removeItem(productId, selectedColor, customText, customizations)
          return
        }

        const line = get().items.find((item) => matches(item, productId, selectedColor, customText, customizations))
        if (line) {
          const delta = Math.min(MAX_LINE_QTY, quantity) - line.quantity
          trackCartChange(delta > 0 ? 'add' : 'remove', line, Math.abs(delta))
        }
        set((state) => ({
          items: state.items.map((item) =>
            matches(item, productId, selectedColor, customText, customizations) ? { ...item, quantity: Math.min(MAX_LINE_QTY, quantity) } : item
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      getItemUnitPrice: (item) => unitPrice(item.product, item.customizations),

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + get().getItemUnitPrice(item) * item.quantity,
          0
        )
      },

      getItemKey: (item) => {
        return getItemKey(item.product.id, item.selectedColor, item.customText, item.customizations)
      },
    }),
    {
      name: 'suthrayaa-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
)

// Wishlist store
interface WishlistState {
  items: Product[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  isInWishlist: (productId: string) => boolean
  clearWishlist: () => void
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product) => {
        if (get().items.some((item) => item.id === product.id)) return
        set((state) => {
          if (state.items.some(item => item.id === product.id)) {
            return state
          }
          return { items: [...state.items, product] }
        })
        analytics.addToWishlist(toItem(product))
      },
      
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(item => item.id !== productId)
        }))
      },
      
      isInWishlist: (productId) => {
        return get().items.some(item => item.id === productId)
      },
      
      clearWishlist: () => set({ items: [] }),
    }),
    {
      name: 'suthrayaa-wishlist',
    }
  )
)
