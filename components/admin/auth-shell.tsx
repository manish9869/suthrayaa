import Image from 'next/image'
import { BarChart3, PackageCheck, ShieldCheck } from 'lucide-react'

const HIGHLIGHTS = [
  { icon: BarChart3, title: 'Live store analytics', text: 'Revenue, orders and customers at a glance.' },
  { icon: PackageCheck, title: 'Order fulfilment', text: 'Move every handmade order from yarn to doorstep.' },
  { icon: ShieldCheck, title: 'Role-based access', text: 'Everyone sees exactly what their role allows.' },
]

/** Split-screen frame for the admin's signed-out pages (sign in, invite acceptance): an
 * ink-dark brand panel on the left (hidden on small screens) and the form on the right. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="admin grid grid-cols-1 min-h-screen bg-background text-foreground lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-peach/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white p-1 shadow-lg ring-2 ring-white/20">
            <span className="relative block h-full w-full">
              <Image src="/logo-mark.png" alt="" fill sizes="64px" className="object-contain" />
            </span>
          </span>
          <span className="leading-tight">
            <span className="block font-serif text-lg font-medium tracking-tight">Suthrayaa</span>
            <span className="block text-xs text-sidebar-foreground/50">Admin Console</span>
          </span>
        </div>
        <div className="relative mt-auto max-w-md">
          <h2 className="font-serif text-4xl font-medium leading-[1.1] tracking-tight">Run your handmade store from one <em className="italic text-peach">calm, focused</em> workspace.</h2>
          <ul className="mt-8 space-y-5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent">
                  <h.icon className="h-4 w-4 text-peach" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{h.title}</span>
                  <span className="block text-sm text-sidebar-foreground/55">{h.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 text-xs text-sidebar-foreground/35">© {new Date().getFullYear()} Suthrayaa · Staff access only</p>
      </aside>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="relative h-14 w-14 shrink-0">
              <Image src="/logo-mark.png" alt="" fill sizes="56px" className="object-contain" />
            </span>
            <span className="font-serif text-lg font-medium tracking-tight">Suthrayaa Admin</span>
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}
