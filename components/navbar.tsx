'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Menu, X, ShoppingBag, Heart, Search, User, ChevronDown, ArrowRight, Truck, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/lib/store'
import { useAuth } from '@/lib/hooks/use-auth'
import { formatPrice, searchProducts, type Category, type Product } from '@/lib/data'
import { buildCategoryTree, totalProductCount } from '@/lib/utils/category-tree'
import { CartDrawer } from './cart-drawer'
import { getPublicNavItems, getPublicSiteSettings } from '@/lib/api/settings'
import { STOREFRONT_IMAGES } from '@/lib/storefront-images'
import { EASE_OUT } from '@/components/motion/reveal'

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

const PERKS = [
  { icon: Truck, text: 'Free shipping on orders over ₹999' },
  { icon: RotateCcw, text: 'Easy 7-day returns' },
  { icon: ShieldCheck, text: 'Secure & safe payments' },
  { icon: Sparkles, text: 'Handmade to order in India' },
]

interface AnnouncementState {
  text: string
  link?: string
  sticky: boolean
}

export function Navbar({ categories = [] }: { categories?: Category[] }) {
  const categoryTree = useMemo(() => buildCategoryTree(categories.filter((c) => c.showInNavigation)), [categories])
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [megaOpen, setMegaOpen] = useState(false)
  const megaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const { getTotalItems, openCart } = useCartStore()
  const totalItems = getTotalItems()
  const { user, signOut } = useAuth()

  // Cart count comes from localStorage-persisted Zustand state, which is empty during SSR —
  // deferring the badge to after mount avoids a hydration mismatch against the server HTML.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close transient panels on navigation
  useEffect(() => {
    setMegaOpen(false)
    setIsSearchOpen(false)
  }, [pathname])

  // Nav links, logo and announcement bar are admin-configurable via Site Settings. Fetched
  // client-side (public, unauthenticated endpoints) with hardcoded fallbacks so the header is
  // never empty/broken if the settings API hiccups or hasn't been configured yet.
  const [navLinks, setNavLinks] = useState<NavLinkItem[]>(FALLBACK_NAV_LINKS)
  const [logoUrl, setLogoUrl] = useState<string>(STOREFRONT_IMAGES.logo)
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
        // No settings loaded — logo stays on the bundled default and the admin announcement
        // stays hidden (the perks strip shows instead).
      })
  }, [])

  // The top strip shows the admin announcement when one is live, otherwise the store perks.
  // Sticky announcements stay pinned while scrolling; everything else collapses once scrolled.
  const topStripSticky = Boolean(announcement?.sticky)
  const showTopStrip = topStripSticky || !isScrolled

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

  // Esc closes search from anywhere
  useEffect(() => {
    if (!isSearchOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSearch()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isSearchOpen])

  // Next.js's <Link> is a no-op when its href matches the current route — clicking "Home" or
  // the logo while already on "/" (but scrolled down) would otherwise do nothing. Scroll to
  // top ourselves in that one case; every other route still navigates normally.
  const handleHomeClick = (e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function closeSearch() {
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

  // Hover intent for the mega menu: open immediately, close after a short grace period so the
  // pointer can travel from the trigger into the panel without it flickering shut.
  const openMega = () => {
    if (megaTimer.current) clearTimeout(megaTimer.current)
    setMegaOpen(true)
  }
  const closeMegaSoon = () => {
    if (megaTimer.current) clearTimeout(megaTimer.current)
    megaTimer.current = setTimeout(() => setMegaOpen(false), 140)
  }

  const isShopLink = (href: string) => href === '/shop' || href.startsWith('/shop?')
  const isActiveLink = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'))
  const megaCategories = categoryTree.slice(0, 6)
  const panelTransition = { duration: reduce ? 0 : 0.22, ease: EASE_OUT }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        {/* Top strip */}
        <div
          className={cn(
            'overflow-hidden bg-primary text-primary-foreground transition-[height] duration-300 ease-[var(--ease-out)]',
            showTopStrip ? 'h-9' : 'h-0'
          )}
        >
          {announcement ? (
            <div className="flex h-9 items-center justify-center px-4 text-center text-[12.5px] font-medium tracking-wide">
              {announcement.link ? (
                <Link href={announcement.link} className="link-underline">
                  {announcement.text}
                </Link>
              ) : (
                announcement.text
              )}
            </div>
          ) : (
            <>
              <div className="hidden h-9 items-center justify-between px-8 text-[12.5px] font-medium tracking-wide lg:flex container mx-auto">
                {PERKS.map((p) => (
                  <span key={p.text} className="flex items-center gap-2 opacity-90">
                    <p.icon className="h-3.5 w-3.5" /> {p.text}
                  </span>
                ))}
              </div>
              <div className="flex h-9 items-center overflow-hidden lg:hidden" aria-hidden>
                <div className="marquee gap-10 pr-10 text-[12px] font-medium">
                  {[...PERKS, ...PERKS].map((p, i) => (
                    <span key={i} className="flex shrink-0 items-center gap-2">
                      <p.icon className="h-3.5 w-3.5" /> {p.text}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Main bar */}
        <div
          className={cn(
            'relative border-b transition-[background-color,border-color,box-shadow] duration-300',
            isScrolled || megaOpen || isSearchOpen
              ? 'border-border/70 bg-background/85 shadow-[0_8px_30px_-18px_rgb(49_32_140/0.35)] backdrop-blur-xl'
              : 'border-transparent bg-background'
          )}
        >
          <nav className="container mx-auto flex h-[72px] items-center gap-4 px-4">
            {/* Mobile menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[88vw] max-w-sm gap-0 bg-background p-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex h-full flex-col">
                  <div className="border-b px-5 py-4">
                    <Link
                      href="/"
                      className="flex items-center gap-3"
                      onClick={(e) => {
                        handleHomeClick(e)
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      <Image src={logoUrl} alt="Suthrayaa" width={96} height={51} className="h-11 w-auto" />
                    </Link>
                  </div>
                  <div className="flex-1 overflow-auto px-3 py-4">
                    {navLinks.map((link, i) => (
                      <motion.div
                        key={link.href}
                        initial={reduce ? false : { opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + i * 0.04, duration: 0.35, ease: EASE_OUT }}
                      >
                        <Link
                          href={link.href}
                          target={link.openInNewTab ? '_blank' : undefined}
                          rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                          onClick={(e) => {
                            if (link.href === '/') handleHomeClick(e)
                            setIsMobileMenuOpen(false)
                          }}
                          className={cn(
                            'flex items-center justify-between rounded-2xl px-4 py-3 font-serif text-2xl transition-colors',
                            isActiveLink(link.href) ? 'bg-accent text-primary' : 'text-foreground hover:bg-muted'
                          )}
                        >
                          {link.label}
                          <ArrowRight className="h-4 w-4 opacity-40" />
                        </Link>
                      </motion.div>
                    ))}
                    {categoryTree.length > 0 && (
                      <div className="mt-6 px-2">
                        <p className="eyebrow mb-3 px-2">Shop by category</p>
                        <div className="grid grid-cols-2 gap-2">
                          {categoryTree.map((top) => (
                            <Link
                              key={top.id}
                              href={`/shop?category=${top.slug}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="flex items-center gap-2.5 rounded-2xl border bg-card p-2 text-sm font-medium"
                            >
                              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-muted">
                                {top.image && <Image src={top.image} alt="" fill sizes="40px" className="object-cover" />}
                              </span>
                              <span className="line-clamp-2 leading-tight">{top.name}</span>
                            </Link>
                          ))}
                        </div>
                        {categoryTree.some((t) => t.children.length > 0) && (
                          <div className="mt-4 space-y-3">
                            {categoryTree
                              .filter((t) => t.children.length > 0)
                              .map((top) => (
                                <div key={top.id}>
                                  <p className="px-2 text-xs font-semibold text-muted-foreground">{top.name}</p>
                                  <div className="mt-1 flex flex-wrap gap-1.5 px-2">
                                    {top.children.flatMap((sub) => [sub, ...sub.children]).map((c) => (
                                      <Link
                                        key={c.id}
                                        href={`/shop?category=${c.slug}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="rounded-full border bg-card px-3 py-1 text-xs"
                                      >
                                        {c.name}
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t p-4">
                    <Button variant="outline" asChild onClick={() => setIsMobileMenuOpen(false)}>
                      <Link href="/wishlist">
                        <Heart className="h-4 w-4" /> Wishlist
                      </Link>
                    </Button>
                    {user ? (
                      <Button variant="outline" onClick={() => signOut()}>
                        <User className="h-4 w-4" /> Sign out
                      </Button>
                    ) : (
                      <Button asChild onClick={() => setIsMobileMenuOpen(false)}>
                        <Link href="/login">
                          <User className="h-4 w-4" /> Sign in
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex shrink-0 items-center gap-2.5" onClick={handleHomeClick} aria-label="Suthrayaa home">
              <Image src={logoUrl} alt="Suthrayaa" width={104} height={55} className="h-14 w-auto lg:h-[60px]" priority />
            </Link>

            {/* Desktop navigation */}
            <div className="hidden flex-1 items-center justify-center gap-9 lg:flex">
              {navLinks.map((link) =>
                isShopLink(link.href) && categoryTree.length > 0 ? (
                  <div key={link.href} onMouseEnter={openMega} onMouseLeave={closeMegaSoon} className="relative">
                    <Link
                      href={link.href}
                      aria-expanded={megaOpen}
                      aria-current={isActiveLink('/shop') ? 'page' : undefined}
                      onFocus={openMega}
                      className="link-underline flex items-center gap-1 py-2 text-[14.5px] font-medium text-foreground/85 hover:text-foreground"
                    >
                      {link.label}
                      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', megaOpen && 'rotate-180')} />
                    </Link>
                  </div>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    target={link.openInNewTab ? '_blank' : undefined}
                    rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                    onClick={link.href === '/' ? handleHomeClick : undefined}
                    aria-current={isActiveLink(link.href) ? 'page' : undefined}
                    className="link-underline py-2 text-[14.5px] font-medium text-foreground/85 hover:text-foreground aria-[current=page]:text-primary"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>

            {/* Actions */}
            <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
              <Button variant="ghost" size="icon" onClick={() => (isSearchOpen ? closeSearch() : setIsSearchOpen(true))} aria-label="Search">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={isSearchOpen ? 'x' : 's'}
                    initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                  </motion.span>
                </AnimatePresence>
              </Button>

              <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
                <Link href="/wishlist" aria-label="Wishlist">
                  <Heart className="h-5 w-5" />
                </Link>
              </Button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Account">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
                    <DropdownMenuLabel className="truncate font-normal">
                      <span className="block text-xs text-muted-foreground">Signed in as</span>
                      <span className="block truncate font-medium">{user.email || user.phone || 'My Account'}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="rounded-xl">
                      <Link href="/wishlist">
                        <Heart /> Wishlist
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => signOut()} className="rounded-xl">
                      <X /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
                  <Link href="/login" aria-label="Sign in">
                    <User className="h-5 w-5" />
                  </Link>
                </Button>
              )}

              <Button variant="ghost" size="icon" className="relative" onClick={openCart} aria-label="Cart">
                <ShoppingBag className="h-5 w-5" />
                <AnimatePresence>
                  {mounted && totalItems > 0 && (
                    <motion.span
                      key={totalItems}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: 'spring', duration: 0.35, bounce: 0.35 }}
                      className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-secondary px-1 text-[10.5px] font-semibold text-secondary-foreground ring-2 ring-background"
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </nav>

          {/* Mega menu */}
          <AnimatePresence>
            {megaOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={panelTransition}
                onMouseEnter={openMega}
                onMouseLeave={closeMegaSoon}
                className="absolute inset-x-0 top-full hidden border-b bg-background/95 shadow-[0_24px_50px_-30px_rgb(49_32_140/0.45)] backdrop-blur-xl lg:block"
              >
                <div className="container mx-auto grid grid-cols-[1fr_320px] gap-10 px-4 py-8">
                  <div>
                    <div className="mb-5 flex items-center justify-between">
                      <p className="eyebrow">Shop by category</p>
                      <Link href="/shop" className="link-underline text-sm font-medium text-primary">
                        View all products
                      </Link>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {megaCategories.map((top) => (
                        <div key={top.id} className="group">
                          <Link href={`/shop?category=${top.slug}`} className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-muted">
                            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
                              {top.image && <Image src={top.image} alt="" fill sizes="56px" className="zoom-img object-cover" />}
                            </span>
                            <span>
                              <span className="block font-medium">{top.name}</span>
                              <span className="block text-xs text-muted-foreground">{totalProductCount(top)} pieces</span>
                            </span>
                          </Link>
                          {top.children.length > 0 && (
                            <div className="ml-[76px] mt-1 space-y-1">
                              {top.children.slice(0, 5).map((sub) => (
                                <Link key={sub.id} href={`/shop?category=${sub.slug}`} className="block text-sm text-muted-foreground hover:text-foreground">
                                  {sub.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link href="/shop?sort=newest" className="group relative block overflow-hidden rounded-3xl bg-primary text-primary-foreground">
                    <Image src={STOREFRONT_IMAGES.megaMenu} alt="" fill sizes="320px" className="zoom-img object-cover object-top opacity-70" />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent" />
                    <div className="relative flex h-full min-h-[220px] flex-col justify-end p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/75">New season</p>
                      <p className="mt-1 font-serif text-2xl leading-tight">Fresh off the hook</p>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium">
                        Explore new arrivals <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search panel */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={panelTransition}
                className="absolute inset-x-0 top-full border-b bg-background/95 shadow-[0_24px_50px_-30px_rgb(49_32_140/0.45)] backdrop-blur-xl"
              >
                <div className="container mx-auto max-w-3xl px-4 py-6">
                  <div className="flex items-center gap-3 rounded-full border bg-card px-5 py-1 shadow-sm focus-within:ring-2 focus-within:ring-ring/30">
                    <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <input
                      type="search"
                      placeholder="Search keychains, amigurumi, coasters…"
                      className="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
                      autoFocus
                    />
                    {searchQuery && (
                      <button onClick={submitSearch} className="shrink-0 text-sm font-medium text-primary">
                        Search
                      </button>
                    )}
                  </div>

                  {searchQuery.trim().length >= 2 ? (
                    <div className="mt-4">
                      {searchLoading ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
                          ))}
                        </div>
                      ) : searchResults.length > 0 ? (
                        <>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {searchResults.map((product, i) => (
                              <motion.div
                                key={product.id}
                                initial={reduce ? false : { opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04, duration: 0.25, ease: EASE_OUT }}
                              >
                                <Link
                                  href={`/product/${product.slug}`}
                                  onClick={closeSearch}
                                  className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-muted"
                                >
                                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                                    <Image src={product.images[0] ?? '/placeholder.svg'} alt={product.name} fill sizes="48px" className="object-cover" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{product.name}</p>
                                    <p className="text-xs text-muted-foreground">{product.category}</p>
                                  </div>
                                  <p className="text-sm font-semibold">{formatPrice(product.price)}</p>
                                </Link>
                              </motion.div>
                            ))}
                          </div>
                          <button onClick={submitSearch} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                            See all results for &quot;{searchQuery.trim()}&quot; <ArrowRight className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <p className="py-4 text-sm text-muted-foreground">No products found for &quot;{searchQuery.trim()}&quot;</p>
                      )}
                    </div>
                  ) : (
                    categoryTree.length > 0 && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Popular:</span>
                        {categoryTree.slice(0, 6).map((c) => (
                          <Link
                            key={c.id}
                            href={`/shop?category=${c.slug}`}
                            onClick={closeSearch}
                            className="rounded-full border bg-card px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Dim the page behind open panels */}
      <AnimatePresence>
        {(megaOpen || isSearchOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-foreground/15 backdrop-blur-[2px]"
            onClick={() => {
              setMegaOpen(false)
              closeSearch()
            }}
          />
        )}
      </AnimatePresence>

      <CartDrawer />

      {/* Spacer for the fixed header (top strip + 72px bar) */}
      <div className="h-[calc(2.25rem+72px)]" />
    </>
  )
}
