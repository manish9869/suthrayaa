'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, ShoppingBag, Heart, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/lib/store'
import { useAuth } from '@/lib/hooks/use-auth'
import type { Category } from '@/lib/data'
import { CartDrawer } from './cart-drawer'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export function Navbar({ categories = [] }: { categories?: Category[] }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
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
        <div className="bg-primary text-primary-foreground text-center py-2 text-sm">
          <p>Free shipping on orders above Rs. 999 | Handmade with love</p>
        </div>

        <nav className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                      <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Suthraya%20Logo%20-%20Trans-HgT4V8esTeOZ2PwWy5B7QcPjLLrahf.png"
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
                          onClick={() => setIsMobileMenuOpen(false)}
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
                        {categories.map((category) => (
                          <Link
                            key={category.slug}
                            href={`/shop?category=${category.slug}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                          >
                            {category.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Suthraya%20Logo%20-%20Trans-HgT4V8esTeOZ2PwWy5B7QcPjLLrahf.png"
                alt="Suthrayaa"
                width={140}
                height={70}
                className="h-12 lg:h-14 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.slice(0, 2).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
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
                <DropdownMenuContent align="center" className="w-56">
                  <DropdownMenuLabel>Shop by category</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {categories.map((category) => (
                    <DropdownMenuItem key={category.slug} asChild>
                      <Link href={`/shop?category=${category.slug}`}>{category.name}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {navLinks.slice(2).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
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
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-background border rounded-full px-3 py-1 shadow-lg animate-in slide-in-from-right-5">
                    <Input
                      type="search"
                      placeholder="Search products..."
                      className="w-48 lg:w-64 border-0 focus-visible:ring-0 h-8"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsSearchOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSearchOpen(true)}
                    aria-label="Search"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Wishlist */}
              <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
                <Link href="/wishlist" aria-label="Wishlist">
                  <Heart className="h-5 w-5" />
                </Link>
              </Button>

              {/* Account */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hidden sm:flex" aria-label="Account">
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
                <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
                  <Link href="/login" aria-label="Sign in">
                    <User className="h-5 w-5" />
                  </Link>
                </Button>
              )}

              {/* Cart */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={openCart}
                aria-label="Cart"
              >
                <ShoppingBag className="h-5 w-5" />
                {mounted && totalItems > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-secondary text-secondary-foreground"
                  >
                    {totalItems}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Spacer for fixed header */}
      <div className="h-[calc(2.5rem+4rem)] lg:h-[calc(2.5rem+5rem)]" />
    </>
  )
}
