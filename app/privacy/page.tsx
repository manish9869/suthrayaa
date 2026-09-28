import type { Metadata } from 'next'
import { PolicyPage } from '@/components/policy-page'

export const metadata: Metadata = {
  title: 'Privacy Policy | Suthrayaa',
  description: 'How Suthrayaa collects, uses, and protects your personal information.',
}

// Content is managed in Admin → Storefront Content → Privacy Policy
export default function Page() {
  return <PolicyPage contentKey="policy.privacy" fallbackTitle="Privacy Policy" />
}
