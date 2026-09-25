import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { AccountShell } from '@/components/account/account-shell'
import { getCategories } from '@/lib/data'

export const metadata: Metadata = { title: 'My account', robots: { index: false } }

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories()
  return (
    <>
      <Navbar categories={categories} />
      <main className="min-h-screen">
        <AccountShell>{children}</AccountShell>
      </main>
      <Footer />
    </>
  )
}
