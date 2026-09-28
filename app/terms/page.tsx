import type { Metadata } from 'next'
import { PolicyPage } from '@/components/policy-page'

export const metadata: Metadata = {
  title: 'Terms & Conditions | Suthrayaa',
  description: 'The terms and conditions for shopping with Suthrayaa.',
}

// Content is managed in Admin → Storefront Content → Terms & Conditions
export default function Page() {
  return <PolicyPage contentKey="policy.terms" fallbackTitle="Terms & Conditions" />
}
