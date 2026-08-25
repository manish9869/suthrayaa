'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ShoppingBag, Heart, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/lib/store'
import { useAuth } from '@/lib/hooks/use-auth'
import { formatPrice, searchProducts, type Category, type Product } from '@/lib/data'
import { buildCategoryTree, type CategoryNode } from '@/lib/utils/category-tree'
import { CartDrawer } from './cart-drawer'
import { getPublicNavItems, getPublicSiteSettings } from '@/lib/api/settings'

interface NavLinkItem {
  href: string
  label: string
  openInNewTab?: boolean
}

const FALLBACK_NAV_LINKS: NavLinkItem[] = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

const FALLBACK_LOGO_URL =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Suthraya%20Logo%20-%20Trans-HgT4V8esTeOZ2PwWy5B7QcPjLLrahf.png'

interface AnnouncementState {
  text: string
  link?: string
  sticky: boolean
}

export function Navbar({ categories = [] }: { categories?: Category[] }) {
  const categoryTree = useMemo(
    () => buildCategoryTree(categories.filter((c) => c.showInNavigation)),
    [categories]
  )
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { getTotalItems, openCart } = useCartStore()
  const totalItems = getTotalItems()
  const { user, signOut } = useAuth()

  // Cart count comes from localStorage-persisted Zustand state, which is empty during SSR —
  // deferring the badge to after mount avoids a hydration mismatch against the server HTML.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Nav links, logo and announcement bar are admin-configurable via Site Settings. Fetched
  // client-side (public, unauthenticated endpoints) with hardcoded fallbacks so the header is
  // never empty/broken if the settings API hiccups or hasn't been configured yet.
  const [navLinks, setNavLinks] = useState<NavLinkItem[]>(FALLBACK_NAV_LINKS)
  const [logoUrl, setLogoUrl] = useState(FALLBACK_LOGO_URL)
  const [announcement, setAnnouncement] = useState<AnnouncementState | null>(null)

  useEffect(() => {
    getPublicNavItems()
      .then((items) => {
        const topLevel = items.filter((item) => !item.parentId)
        if (topLevel.length === 0) return
        const sorted = [...topLevel].sort((a, b) => a.sortOrder - b.sortOrder)
        setNavLinks(sorted.map((item) => ({ href: item.url, label: item.label, openInNewTab: item.openInNewTab })))
      })
      .catch(() => {
        // Keep the hardcoded fallback nav so the header is never empty.
      })
  }, [])

  useEffect(() => {
    getPublicSiteSettings()
      .then((settings) => {
        const branding = settings.branding ?? {}
        const logo = branding['branding.logo_url']
        if (typeof logo === 'string' && logo.trim()) setLogoUrl(logo)

        const header = settings.header ?? {}
        const enabled = Boolean(header['header.announcement_enabled'])
        const text = header['header.announcement_text']
        const startDate = header['header.announcement_start_date']
        const endDate = header['header.announcement_end_date']
        const now = new Date()
        const afterStart = !startDate || now >= new Date(String(startDate))
        const beforeEnd = !endDate || now <= new Date(String(endDate))

        if (enabled && typeof text === 'string' && text.trim() && afterStart && beforeEnd) {
          const link = header['header.announcement_link']
          setAnnouncement({
            text,
            link: typeof link === 'string' && link.trim() ? link : undefined,
            sticky: Boolean(header['header.announcement_sticky']),
          })
        }
      })
      .catch(() => {
        // No settings loaded — logo falls back to the hardcoded default and the announcement
        // bar simply stays hidden (it's opt-in/admin-controlled, unlike the nav/logo).
      })
  }, [])

  // Sticky announcements stay pinned inside the fixed header while scrolling (today's
  // behavior); non-sticky ones only show at the top of the page and collapse once scrolled —
  // reusing the existing isScrolled tracking above instead of introducing new scroll logic.
  const showAnnouncement = Boolean(announcement) && (announcement!.sticky || !isScrolled)
  const navMidpoint = Math.ceil(navLinks.length / 2)

  // Debounced live search — queries the same /products search endpoint as the shop page,
  // just trimmed to a handful of quick suggestions.
  useEffect(() => {
    const query = searchQuery.trim()
    if (query.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    const t = setTimeout(() => {
      searchProducts(query, 5)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Next.js's <Link> is a no-op when its href matches the current route — clicking "Home" or
  // the logo while already on "/" (but scrolled down) would otherwise do nothing. Scroll to
  // top ourselves in that one case; every other route still navigates normally.
  const handleHomeClick = (e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const closeSearch = () => {
    setIsSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const submitSearch = () => {
    const query = searchQuery.trim()
    if (!query) return
    router.push(`/shop?search=${encodeURIComponent(query)}`)
    closeSearch()
  }

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-background/95 backdrop-blur-md shadow-soft'
            : 'bg-transparent'
        )}
      >
        {/* Announcement Bar */}
        {showAnnouncement && announcement && (
          <div className="bg-primary text-primary-foreground text-center py-2 text-sm overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={announcement.text}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="flex items-center justify-center gap-1.5"
              >
                {announcement.link ? (
                  <Link href={announcement.link} className="hover:underline">
                    {announcement.text}
                  </Link>
                ) : (
                  announcement.text
                )}
              </motion.p>
            </AnimatePresence>
          </div>
        )}

        <nav className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="tap-bounce" aria-label="Open menu">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <Link
                      href="/"
                      onClick={(e) => {
                        handleHomeClick(e)
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      <Image
                        src={logoUrl}
                        alt="Suthrayaa"
                        width={120}
                        height={60}
                        className="h-12 w-auto"
                      />
                    </Link>
                  </div>
                  <div className="flex-1 overflow-auto py-4">
                    <div className="space-y-1 px-2">
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          target={link.openInNewTab ? '_blank' : undefined}
                          rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                          onClick={(e) => {
                            if (link.href === '/') handleHomeClick(e)
                            setIsMobileMenuOpen(false)
                          }}
                          className={cn(
                            'block px-4 py-3 rounded-lg text-lg transition-colors',
                            pathname === link.href
                              ? 'bg-muted text-primary font-medium'
                              : 'text-foreground hover:bg-muted'
                          )}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                    <div className="mt-6 px-4">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                        Categories
                      </h3>
                      <div className="space-y-1">
                        {categoryTree.map((top) => (
                          <div key={top.id} className="mb-2">
                            <Link
                              href={`/shop?category=${top.slug}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="block px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted rounded-lg transition-colors"
                            >
                              {top.name}
                            </Link>
                            {top.children.map((sub) => (
                              <div key={sub.id}>
                                <Link
                                  href={`/shop?category=${sub.slug}`}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="block pl-8 pr-4 py-1.5 text-sm text-foreground/80 hover:bg-muted rounded-lg transition-colors"
                                >
                                  {sub.name}
                                </Link>
                                {sub.children.map((leaf) => (
                                  <Link
                                    key={leaf.id}
                                    href={`/shop?category=${leaf.slug}`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="block pl-12 pr-4 py-1 text-xs text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                                  >
                                    {leaf.name}
                                  </Link>
                                ))}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex-shrink-0" onClick={handleHomeClick}>
              <Image
                src={logoUrl}
                alt="Suthrayaa"
                width={140}
                height={70}
                className="h-12 lg:h-14 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.slice(0, navMidpoint).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.openInNewTab ? '_blank' : undefined}
                  rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                  onClick={link.href === '/' ? handleHomeClick : undefined}
                  className={cn(
                    'text-sm font-medium transition-colors relative py-2',
                    pathname === link.href ? 'text-primary' : 'text-foreground/80 hover:text-primary',
                    'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-secondary after:scale-x-0 after:transition-transform after:origin-center hover:after:scale-x-100',
                    pathname === link.href && 'after:scale-x-100'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger className="relative py-2 text-sm font-medium text-foreground/80 hover:text-primary outline-none">
                  Categories
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-72 max-h-[75vh] overflow-y-auto">
                  <DropdownMenuLabel>Shop by category</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {categoryTree.map((top) => (
                    <Fragment key={top.id}>
                      <DropdownMenuItem asChild className="font-semibold mt-1 first:mt-0">
                        <Link href={`/shop?category=${top.slug}`}>{top.name}</Link>
                      </DropdownMenuItem>
                      {top.children.map((sub) => (
                        <Fragment key={sub.id}>
                          <DropdownMenuItem asChild className="pl-6 text-foreground/80">
                            <Link href={`/shop?category=${sub.slug}`}>{sub.name}</Link>
                          </DropdownMenuItem>
                          {sub.children.map((leaf) => (
                            <DropdownMenuItem key={leaf.id} asChild className="pl-10 text-sm text-muted-foreground">
                              <Link href={`/shop?category=${leaf.slug}`}>{leaf.name}</Link>
                            </DropdownMenuItem>
                          ))}
                        </Fragment>
                      ))}
                    </Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {navLinks.slice(navMidpoint).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.openInNewTab ? '_blank' : undefined}
                  rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                  onClick={link.href === '/' ? handleHomeClick : undefined}
                  className={cn(
                    'text-sm font-medium transition-colors relative py-2',
                    pathname === link.href ? 'text-primary' : 'text-foreground/80 hover:text-primary',
                    'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-secondary after:scale-x-0 after:transition-transform after:origin-center hover:after:scale-x-100',
                    pathname === link.href && 'after:scale-x-100'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                {isSearchOpen ? (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-72 lg:w-80">
                    <div className="flex items-center gap-2 bg-background border rounded-full px-3 py-1 shadow-lg animate-in slide-in-from-right-5">
                      <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <Input
                        type="search"
                        placeholder="Search for keychains, amigurumi..."
                        className="border-0 focus-visible:ring-0 h-8 px-0"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitSearch()
                          if (e.key === 'Escape') closeSearch()
                        }}
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={closeSearch}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Autosuggest */}
                    <AnimatePresence>
                      {searchQuery.trim().length >= 2 && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full mt-2 w-full bg-popover border rounded-xl shadow-lg overflow-hidden"
                        >
                          {searchLoading ? (
                            <p className="px-4 py-3 text-sm text-muted-foreground">Searching...</p>
                          ) : searchResults.length > 0 ? (
                            <>
                              <div className="max-h-80 overflow-y-auto py-1">
                                {searchResults.map((product) => (
                                  <Link
                                    key={product.id}
                                    href={`/product/${product.slug}`}
                                    onClick={closeSearch}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors"
                                  >
                                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                                      <Image src={product.images[0] ?? '/placeholder.svg'} alt={product.name} fill className="object-cover" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium truncate">{product.name}</p>
                                      <p className="text-xs text-secondary font-semibold">{formatPrice(product.price)}</p>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                              <button
                                onClick={submitSearch}
                                className="w-full text-center text-sm font-medium text-primary py-2.5 border-t hover:bg-muted transition-colors"
                              >
                                See all results for &quot;{searchQuery.trim()}&quot;
                              </button>
                            </>
                          ) : (
                            <p className="px-4 py-3 text-sm text-muted-foreground">No products found for &quot;{searchQuery.trim()}&quot;</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="tap-bounce"
                    onClick={() => setIsSearchOpen(true)}
                    aria-label="Search"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Wishlist */}
              <Button variant="ghost" size="icon" asChild className="hidden sm:flex tap-bounce">
                <Link href="/wishlist" aria-label="Wishlist">
                  <Heart className="h-5 w-5" />
                </Link>
              </Button>

              {/* Account */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hidden sm:flex tap-bounce" aria-label="Account">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="truncate">
                      {user.email || user.phone || 'My Account'}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()}>Sign Out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="icon" asChild className="hidden sm:flex tap-bounce">
                  <Link href="/login" aria-label="Sign in">
                    <User className="h-5 w-5" />
                  </Link>
                </Button>
              )}

              {/* Cart */}
              <Button
                variant="ghost"
                size="icon"
                className="relative tap-bounce"
                onClick={openCart}
                aria-label="Cart"
              >
                <ShoppingBag className="h-5 w-5" />
                <AnimatePresence>
                  {mounted && totalItems > 0 && (
                    <motion.div
                      key={totalItems}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      className="absolute -top-1 -right-1"
                    >
                      <Badge className="h-5 w-5 flex items-center justify-center p-0 text-xs bg-secondary text-secondary-foreground">
                        {totalItems}
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Spacer for fixed header */}
      <div className={showAnnouncement ? 'h-[calc(2.5rem+4rem)] lg:h-[calc(2.5rem+5rem)]' : 'h-16 lg:h-20'} />
    </>
  )
}
