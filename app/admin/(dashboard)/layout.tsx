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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/colors', label: 'Colors', icon: Palette },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/coupons', label: 'Coupons', icon: Tags },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
  { href: '/admin/hero-slides', label: 'Hero Slides', icon: ImageIcon },
  { href: '/admin/emails/templates', label: 'Email Templates', icon: Mail },
  { href: '/admin/emails/logs', label: 'Email Logs', icon: History },
  { href: '/admin/settings/invoice', label: 'Invoice Settings', icon: Receipt },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [admin, setAdmin] = useState<AdminMe | null>(null)
  const [checking, setChecking] = useState(true)
  const [denied, setDenied] = useState(false)

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
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>
  }

  if (denied || !admin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
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
    <div className="min-h-screen flex bg-muted/20">
      <aside className="w-64 border-r bg-background flex flex-col">
        <div className="p-6 border-b">
          <Link href="/admin" className="font-serif text-xl font-bold">
            Suthrayaa Admin
          </Link>
          <p className="text-xs text-muted-foreground mt-1">{admin.displayName ?? admin.role}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted"
          >
            View Store
          </Link>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
