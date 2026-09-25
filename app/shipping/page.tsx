import type { Metadata } from 'next'
import { PolicyPage } from '@/components/policy-page'

export const metadata: Metadata = {
  title: 'Shipping Info | Suthrayaa',
  description: 'Processing times, delivery estimates, and shipping costs for Suthrayaa orders.',
}

// Content is managed in Admin → Storefront Content → Shipping Info
export default function Page() {
  return <PolicyPage contentKey="policy.shipping" fallbackTitle="Shipping Info" />
}
