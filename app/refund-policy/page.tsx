import type { Metadata } from 'next'
import { PolicyPage } from '@/components/policy-page'

export const metadata: Metadata = {
  title: 'Refund Policy | Suthrayaa',
  description: 'How and when refunds are issued for Suthrayaa orders.',
}

// Content is managed in Admin → Storefront Content → Refund Policy
export default function Page() {
  return <PolicyPage contentKey="policy.refund" fallbackTitle="Refund Policy" />
}
