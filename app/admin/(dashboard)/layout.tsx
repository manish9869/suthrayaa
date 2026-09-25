'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { LogoLoader } from '@/components/logo-loader'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { RbacProvider, useRbac } from '@/lib/rbac/rbac-context'
import { AccessDenied } from '@/components/admin/access-denied'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Palette,
  ShoppingCart,
  Tags,
  Users,
  MessageSquareQuote,
  Image as ImageIcon,
  Mail,
  History,
  Receipt,
  LogOut,
  Store,
  ShieldCheck,
  ScrollText,
  Settings2,
  Search,
  Menu,
  Moon,
  Sun,
  ChevronDown,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { PortalContainerContext } from '@/components/theme-portal'

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  /** Omit for items every active admin should see regardless of permissions (just "Dashboard"). */
  permission?: string
  /** Extra path prefixes that belong to this item (e.g. /admin/roles lives under Users & Roles). */
  aliases?: string[]
}
interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard, permission: 'analytics.view' }],
  },
  {
    title: 'Catalog',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package, permission: 'products.view' },
      { href: '/admin/categories', label: 'Categories', icon: FolderTree, permission: 'categories.view' },
      { href: '/admin/colors', label: 'Colors', icon: Palette, permission: 'colors.view' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, permission: 'orders.view' },
      { href: '/admin/coupons', label: 'Coupons', icon: Tags, permission: 'coupons.view' },
      { href: '/admin/customers', label: 'Customers', icon: Users, permission: 'customers.view' },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote, permission: 'content.view' },
      { href: '/admin/hero-slides', label: 'Hero Slides', icon: ImageIcon, permission: 'banners.view' },
    ],
  },
  {
    title: 'Communications',
    items: [
      { href: '/admin/emails/templates', label: 'Email Templates', icon: Mail, permission: 'emails.view' },
      { href: '/admin/emails/logs', label: 'Email Logs', icon: History, permission: 'emails.view' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { href: '/admin/users', label: 'Users & Roles', icon: ShieldCheck, permission: 'users.view', aliases: ['/admin/roles'] },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, permission: 'audit_logs.view' },
      { href: '/admin/settings', label: 'Site Settings', icon: Settings2, permission: 'settings.view' },
      { href: '/admin/settings/invoice', label: 'Invoice Settings', icon: Receipt, permission: 'settings.view' },
    ],
  },
]

function visibleNavGroups(hasPermission: (slug: string) => boolean): NavGroup[] {
  return navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.permission || hasPermission(item.permission)) }))
    .filter((group) => group.items.length > 0)
}

function firstAccessibleHref(hasPermission: (slug: string) => boolean): string | null {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (!item.permission || hasPermission(item.permission)) return item.href
    }
  }
  return null
}

type AdminTheme = 'light' | 'dark'
const THEME_STORAGE_KEY = 'suthrayaa-admin-theme'
const SIDEBAR_STORAGE_KEY = 'suthrayaa-admin-sidebar-collapsed'

function isActive(pathname: string, item: NavItem | string) {
  const href = typeof item === 'string' ? item : item.href
  if (typeof item !== 'string' && item.aliases?.some((a) => pathname === a || pathname.startsWith(a + '/'))) return true
  if (href === '/admin') return pathname === href
  // "/admin/settings" must not light up while on "/admin/settings/invoice", which has its own item
  if (href === '/admin/settings') return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link href="/admin" className="flex items-center gap-3" title="Suthrayaa Admin">
      {/* The storefront logo, inverted to white on the indigo sidebar (as in the storefront footer) */}
      <span className="relative h-10 w-10 shrink-0">
        <Image src="/logo.png" alt="" fill sizes="40px" className="object-contain brightness-0 invert" />
      </span>
      {!collapsed && (
        <span className="leading-tight">
          <span className="block font-serif text-[17px] font-medium tracking-tight text-sidebar-foreground">Suthrayaa</span>
          <span className="block text-[11px] font-medium text-sidebar-foreground/45">Admin Console</span>
        </span>
      )}
    </Link>
  )
}

const NAV_LINK =
  'group flex items-center gap-3 rounded-xl text-[14px] font-medium transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
const NAV_LINK_ACTIVE =
  'bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-[0_1px_2px_rgb(0_0_0/0.12),0_4px_12px_-6px_rgb(0_0_0/0.35)] hover:bg-sidebar-primary hover:text-sidebar-primary-foreground'
const NAV_ICON = 'h-[18px] w-[18px] shrink-0 transition-colors'

/** Expanded sidebar: a flat list of every page, grouped under small uppercase section labels
 * (no accordions), so the whole console is one glance away. The current page is a raised pill. */
function SidebarNav({ groups, pathname, onNavigate }: { groups: NavGroup[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 min-h-0 overflow-y-auto px-3 pb-4 pt-1 [scrollbar-width:thin]">
      {groups.map((group, gi) => (
        <div key={group.title} className={cn(gi > 0 && 'mt-5')}>
          <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/40">{group.title}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(NAV_LINK, 'px-3 py-2', active && NAV_LINK_ACTIVE)}
                >
                  <item.icon
                    className={cn(NAV_ICON, active ? 'text-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/85')}
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

/** Collapsed icon rail: the same flat list as icons, with a hairline between sections. */
function SidebarRail({ groups, pathname }: { groups: NavGroup[]; pathname: string }) {
  return (
    <nav className="flex-1 min-h-0 overflow-y-auto px-2.5 pb-4 pt-1 [scrollbar-width:none]">
      {groups.map((group, gi) => (
        <div key={group.title} className={cn('space-y-1', gi > 0 && 'mt-3 border-t border-sidebar-border pt-3')}>
          {group.items.map((item) => {
            const active = isActive(pathname, item)
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={cn(NAV_LINK, 'h-10 justify-center', active && NAV_LINK_ACTIVE)}
              >
                <item.icon
                  className={cn(NAV_ICON, active ? 'text-primary' : 'text-sidebar-foreground/55 group-hover:text-sidebar-foreground')}
                  strokeWidth={active ? 2.25 : 1.75}
                />
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function SidebarBody({
  groups,
  pathname,
  onNavigate,
  onSignOut,
  collapsed = false,
  onToggleCollapsed,
}: {
  groups: NavGroup[]
  pathname: string
  onNavigate?: () => void
  onSignOut: () => void
  collapsed?: boolean
  onToggleCollapsed?: () => void
}) {
  const footerLink = cn(NAV_LINK, collapsed ? 'h-11 w-full justify-center' : 'w-full px-3 py-2.5')
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn('flex items-center pt-5 pb-3', collapsed ? 'flex-col gap-3 px-2.5' : 'justify-between px-5')}>
        <BrandMark collapsed={collapsed} />
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/45 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>
      {collapsed ? <SidebarRail groups={groups} pathname={pathname} /> : <SidebarNav groups={groups} pathname={pathname} onNavigate={onNavigate} />}
      <div className={cn('border-t border-sidebar-border space-y-0.5', collapsed ? 'p-2.5' : 'p-3')}>
        <Link href="/" target="_blank" title="View Store" className={footerLink}>
          <Store className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/45" />
          {!collapsed && (
            <>
              View Store
              <ExternalLink className="ml-auto h-3.5 w-3.5 text-sidebar-foreground/35" />
            </>
          )}
        </Link>
        <button onClick={onSignOut} title="Log out" className={footerLink}>
          <LogOut className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/45" />
          {!collapsed && 'Log out'}
        </button>
      </div>
    </div>
  )
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { admin, loading, denied, roles, hasPermission } = useRbac()
  const { signOut } = useAuth()
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [theme, setTheme] = useState<AdminTheme>('light')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(THEME_STORAGE_KEY) === 'dark') setTheme('dark')
    } catch {
      // storage unavailable (private mode etc.) — stay on the light default
    }
  }, [])
  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1') setCollapsed(true)
    } catch {
      // storage unavailable — start expanded
    }
  }, [])
  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, c ? '0' : '1')
      } catch {
        // non-persistent is fine
      }
      return !c
    })
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light'
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // non-persistent is fine
      }
      return next
    })
  }, [])

  // ⌘K / Ctrl+K opens the quick-jump palette from anywhere in the admin
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
      // ⌘B / Ctrl+B collapses the sidebar to its icon rail (and back)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleCollapsed()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleCollapsed])

  // The dashboard is entirely analytics-driven — a role without analytics.view (Support
  // Agent, Order Manager, etc.) would otherwise land on a 403 immediately after logging in.
  // Send them to the first section their role actually has instead.
  useEffect(() => {
    if (loading || denied) return
    if (pathname === '/admin' && !hasPermission('analytics.view')) {
      const fallback = firstAccessibleHref(hasPermission)
      if (fallback && fallback !== '/admin') router.replace(fallback)
    }
  }, [loading, denied, pathname, hasPermission, router])

  if (loading) return <AdminSplash />

  if (denied || !admin) {
    return (
      <AccessDenied
        variant="full"
        message="This account doesn't have admin access. Contact the store owner if you believe this is a mistake."
      />
    )
  }

  const groups = visibleNavGroups(hasPermission)
  const allItems = groups.flatMap((g) => g.items)
  const current = allItems.filter((i) => isActive(pathname, i)).sort((a, b) => b.href.length - a.href.length)[0]
  const currentGroup = groups.find((g) => current && g.items.includes(current))
  const displayName = admin.displayName ?? admin.email ?? 'Admin'
  const initials = displayName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <PortalContainerContext.Provider value={portalContainer}>
      <div ref={setPortalContainer} className={cn('admin h-screen flex bg-background text-foreground overflow-hidden', theme === 'dark' && 'dark')}>
        {/* Desktop sidebar */}
        <aside
          className={cn(
            'hidden lg:flex flex-shrink-0 flex-col h-full border-r border-sidebar-border transition-[width] duration-300 ease-out',
            collapsed ? 'w-[76px]' : 'w-[264px]'
          )}
        >
          <SidebarBody
            groups={groups}
            pathname={pathname}
            onSignOut={() => signOut()}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
          />
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[280px] p-0 border-sidebar-border bg-sidebar [&>button]:text-sidebar-foreground [&>button]:!bg-transparent">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarBody groups={groups} pathname={pathname} onNavigate={() => setMobileNavOpen(false)} onSignOut={() => signOut()} />
          </SheetContent>
        </Sheet>

        <div className="flex-1 min-w-0 flex flex-col h-full">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <Button variant="ghost" size="icon" className="lg:hidden -ml-1" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden md:block shrink-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{currentGroup?.title ?? 'Admin'}</p>
              <p className="truncate text-sm font-semibold">{current?.label ?? 'Admin'}</p>
            </div>

            <button
              onClick={() => setSearchOpen(true)}
              className="ml-auto md:ml-8 flex h-10 w-full min-w-0 max-w-md items-center gap-2.5 rounded-xl border bg-muted/60 px-3.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <Search className="h-4 w-4" />
              <span className="truncate">Search pages…</span>
              <kbd className="ml-auto hidden sm:inline-flex h-6 items-center gap-0.5 rounded-md border bg-card px-1.5 font-mono text-[11px] font-medium">
                ⌘K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl border bg-card"
                onClick={toggleTheme}
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                title={theme === 'light' ? 'Dark mode' : 'Light mode'}
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-muted">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-sm font-semibold text-primary-foreground">
                      {initials || '?'}
                    </span>
                    <span className="hidden sm:block text-left leading-tight">
                      <span className="block max-w-[160px] truncate text-sm font-semibold">{displayName}</span>
                      <span className="block max-w-[160px] truncate text-[11px] text-muted-foreground">
                        {roles[0]?.name ?? 'No role assigned'}
                      </span>
                    </span>
                    <ChevronDown className="hidden sm:block h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <p className="truncate text-sm font-semibold">{displayName}</p>
                    {admin.email && <p className="truncate text-xs text-muted-foreground">{admin.email}</p>}
                    {roles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {roles.map((r) => (
                          <span key={r.id} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-medium text-primary">
                            {r.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/" target="_blank">
                      <Store /> View store
                    </Link>
                  </DropdownMenuItem>
                  {hasPermission('settings.view') && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/settings">
                        <Settings2 /> Site settings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={toggleTheme}>
                    {theme === 'light' ? <Moon /> : <Sun />} {theme === 'light' ? 'Dark mode' : 'Light mode'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => signOut()}>
                    <LogOut /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>

        <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title="Jump to" description="Search admin pages">
          <CommandInput placeholder="Search pages…" />
          <CommandList>
            <CommandEmpty>No matching pages.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.title} heading={group.title}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`${group.title} ${item.label}`}
                    onSelect={() => {
                      setSearchOpen(false)
                      router.push(item.href)
                    }}
                  >
                    <item.icon /> {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </CommandDialog>
      </div>
    </PortalContainerContext.Provider>
  )
}

function AdminSplash() {
  return (
    <div className="admin bg-background">
      <LogoLoader fullScreen label="Opening your workspace…" />
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace(`/admin/login?redirect=${pathname}`)
  }, [user, authLoading, pathname, router])

  if (authLoading || !user) {
    return <AdminSplash />
  }

  return (
    <RbacProvider>
      <AdminShell>{children}</AdminShell>
    </RbacProvider>
  )
}
