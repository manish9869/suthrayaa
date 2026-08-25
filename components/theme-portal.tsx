'use client'

import { createContext, useContext } from 'react'

// Radix portal components (Sheet, Popover, Select, Dialog, DropdownMenu...) render into
// document.body by default — outside the `.dark` class scoped to the admin layout's wrapper
// div. That means their CSS variables fall back to :root (the light storefront theme),
// making dropdowns/sheets/dialogs render in the wrong palette inside admin. AdminLayout
// provides this context pointing at its dark-scoped wrapper element so those portals mount
// inside it instead; outside admin (no provider) it's null and Radix falls back to its
// normal document.body default, unaffected.
export const PortalContainerContext = createContext<HTMLElement | null>(null)

export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContainerContext) ?? undefined
}
