import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from './data'

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
    customizations?: CartCustomizationSelection[]
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

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, selectedColor, customText, customizations) => {
        set((state) => {
          const existingIndex = state.items.findIndex((item) =>
            matches(item, product.id, selectedColor, customText, customizations)
          )

          if (existingIndex > -1) {
            const newItems = [...state.items]
            newItems[existingIndex].quantity += 1
            return { items: newItems }
          }

          return {
            items: [...state.items, { product, quantity: 1, selectedColor, customText, customizations }],
          }
        })
      },

      removeItem: (productId, selectedColor, customText, customizations) => {
        set((state) => ({
          items: state.items.filter((item) => !matches(item, productId, selectedColor, customText, customizations)),
        }))
      },

      updateQuantity: (productId, selectedColor, quantity, customText, customizations) => {
        if (quantity <= 0) {
          get().removeItem(productId, selectedColor, customText, customizations)
          return
        }

        set((state) => ({
          items: state.items.map((item) =>
            matches(item, productId, selectedColor, customText, customizations) ? { ...item, quantity } : item
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

      getItemUnitPrice: (item) => {
        const adjustments = (item.customizations ?? []).reduce((sum, c) => sum + c.priceAdjustment, 0)
        return item.product.price + adjustments
      },

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
        set((state) => {
          if (state.items.some(item => item.id === product.id)) {
            return state
          }
          return { items: [...state.items, product] }
        })
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
