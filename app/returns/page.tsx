import type { Metadata } from 'next'
import { PolicyPage } from '@/components/policy-page'

export const metadata: Metadata = {
  title: 'Returns & Refunds | Suthrayaa',
  description: 'Our return policy and how to start a return for eligible Suthrayaa orders.',
}

// Content is managed in Admin → Storefront Content → Returns & Refunds
export default function Page() {
  return <PolicyPage contentKey="policy.returns" fallbackTitle="Returns & Refunds" />
}
