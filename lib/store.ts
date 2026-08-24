import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from './data'

export interface CartItem {
  product: Product
  quantity: number
  selectedColor: string
  customText?: string
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  
  // Actions
  addItem: (product: Product, selectedColor: string, customText?: string) => void
  removeItem: (productId: string, selectedColor: string, customText?: string) => void
  updateQuantity: (productId: string, selectedColor: string, quantity: number, customText?: string) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  
  // Computed
  getTotalItems: () => number
  getTotalPrice: () => number
  getItemKey: (item: CartItem) => string
}

const getItemKey = (productId: string, selectedColor: string, customText?: string) => {
  return `${productId}-${selectedColor}-${customText || ''}`
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      
      addItem: (product, selectedColor, customText) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            item => 
              item.product.id === product.id && 
              item.selectedColor === selectedColor &&
              item.customText === customText
          )
          
          if (existingIndex > -1) {
            const newItems = [...state.items]
            newItems[existingIndex].quantity += 1
            return { items: newItems }
          }
          
          return {
            items: [...state.items, { product, quantity: 1, selectedColor, customText }]
          }
        })
      },
      
      removeItem: (productId, selectedColor, customText) => {
        set((state) => ({
          items: state.items.filter(
            item => !(
              item.product.id === productId && 
              item.selectedColor === selectedColor &&
              item.customText === customText
            )
          )
        }))
      },
      
      updateQuantity: (productId, selectedColor, quantity, customText) => {
        if (quantity <= 0) {
          get().removeItem(productId, selectedColor, customText)
          return
        }
        
        set((state) => ({
          items: state.items.map(item =>
            item.product.id === productId && 
            item.selectedColor === selectedColor &&
            item.customText === customText
              ? { ...item, quantity }
              : item
          )
        }))
      },
      
      clearCart: () => set({ items: [] }),
      
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },
      
      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        )
      },
      
      getItemKey: (item) => {
        return getItemKey(item.product.id, item.selectedColor, item.customText)
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
