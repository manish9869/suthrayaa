'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { PortalContainerContext } from '@/components/theme-portal'

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  /** Omit for items every active admin should see regardless of permissions (just "Dashboard"). */
  permission?: string
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
      { href: '/admin/users', label: 'Users & Roles', icon: ShieldCheck, permission: 'users.view' },
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

function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { admin, loading, denied, roles, hasPermission, refresh } = useRbac()
  const { signOut } = useAuth()
  const [darkContainer, setDarkContainer] = useState<HTMLElement | null>(null)

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

  if (loading) {
    return (
      <div className="dark flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="font-serif text-2xl font-bold tracking-tight text-foreground">Suthrayaa</p>
        <Spinner className="size-6 text-primary" />
      </div>
    )
  }

  if (denied || !admin) {
    return (
      <AccessDenied
        variant="full"
        message="This account doesn't have admin access. Contact the store owner if you believe this is a mistake."
      />
    )
  }

  const groups = visibleNavGroups(hasPermission)
  const primaryRole = roles[0]

  return (
    <PortalContainerContext.Provider value={darkContainer}>
      <div ref={setDarkContainer} className="dark h-screen flex bg-background text-foreground overflow-hidden">
        <aside className="w-72 flex-shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col h-full">
          <div className="px-6 py-6 border-b border-sidebar-border">
            <Link href="/admin" className="font-serif text-xl font-bold text-sidebar-foreground tracking-tight">
              Suthrayaa
            </Link>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-primary mt-0.5">Admin</p>
          </div>

          <nav className="flex-1 min-h-0 px-4 py-5 space-y-6 overflow-y-auto">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active =
                      item.href === '/admin' ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-all',
                          active
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="px-4 pb-2">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-full text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <Store className="h-4 w-4 shrink-0" /> View Store
            </Link>
          </div>

          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/15 text-sm font-semibold text-sidebar-primary">
                {(admin.displayName ?? admin.email ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{admin.displayName ?? admin.email}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {roles.length ? (
                    roles.map((r) => (
                      <Badge key={r.id} variant="secondary" className="px-1.5 py-0 text-[10px] font-medium">
                        {r.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-sidebar-foreground/50">No roles assigned</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" /> Sign Out
            </button>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </PortalContainerContext.Provider>
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
    return (
      <div className="dark flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="font-serif text-2xl font-bold tracking-tight text-foreground">Suthrayaa</p>
        <Spinner className="size-6 text-primary" />
      </div>
    )
  }

  return (
    <RbacProvider>
      <AdminShell>{children}</AdminShell>
    </RbacProvider>
  )
}
