'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { getAdminMe, type AdminMe } from '@/lib/api/admin'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { PortalContainerContext } from '@/components/theme-portal'

const navGroups = [
  {
    title: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Catalog',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/categories', label: 'Categories', icon: FolderTree },
      { href: '/admin/colors', label: 'Colors', icon: Palette },
    ],
  },
  {
    title: 'Sales',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/admin/coupons', label: 'Coupons', icon: Tags },
      { href: '/admin/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
      { href: '/admin/hero-slides', label: 'Hero Slides', icon: ImageIcon },
    ],
  },
  {
    title: 'Communications',
    items: [
      { href: '/admin/emails/templates', label: 'Email Templates', icon: Mail },
      { href: '/admin/emails/logs', label: 'Email Logs', icon: History },
    ],
  },
  {
    title: 'Settings',
    items: [{ href: '/admin/settings/invoice', label: 'Invoice Settings', icon: Receipt }],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [admin, setAdmin] = useState<AdminMe | null>(null)
  const [checking, setChecking] = useState(true)
  const [denied, setDenied] = useState(false)
  const [darkContainer, setDarkContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace(`/admin/login?redirect=${pathname}`)
      return
    }
    getAdminMe()
      .then((me) => setAdmin(me))
      .catch(() => setDenied(true))
      .finally(() => setChecking(false))
  }, [user, authLoading, pathname, router])

  if (authLoading || checking) {
    return (
      <div className="dark flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="font-serif text-2xl font-bold tracking-tight text-foreground">Suthrayaa</p>
        <Spinner className="size-6 text-primary" />
      </div>
    )
  }

  if (denied || !admin) {
    return (
      <div className="dark min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4 bg-background text-foreground">
        <h1 className="text-2xl font-serif font-bold">Access Denied</h1>
        <p className="text-muted-foreground max-w-sm">
          This account doesn&apos;t have admin access. Contact the store owner if you believe this is a mistake.
        </p>
        <Button variant="outline" onClick={() => router.push('/')}>
          Back to Store
        </Button>
      </div>
    )
  }

  return (
    <PortalContainerContext.Provider value={darkContainer}>
    <div ref={setDarkContainer} className="dark h-screen flex bg-background text-foreground overflow-hidden">
      <aside className="w-72 flex-shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col h-full">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <Link href="/admin" className="font-serif text-xl font-bold text-sidebar-foreground tracking-tight">
            Suthrayaa
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-primary mt-0.5">
            Admin
          </p>
        </div>

        <nav className="flex-1 min-h-0 px-4 py-5 space-y-6 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active =
                    item.href === '/admin'
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(item.href + '/')
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
              {(admin.displayName ?? admin.role).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {admin.displayName ?? admin.role}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/50 capitalize">{admin.role}</p>
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
