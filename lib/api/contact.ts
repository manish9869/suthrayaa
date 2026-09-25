import { apiFetch } from './http'

export interface ContactMessageInput {
  name: string
  email: string
  subject?: string
  message: string
}

export async function sendContactMessage(input: ContactMessageInput) {
  return apiFetch<{ ok: true }>('/contact', {
    method: 'POST',
    revalidate: false,
    body: JSON.stringify(input),
  })
}

/** Newsletter signup (footer + homepage). Idempotent — re-subscribing an address is fine. */
export async function subscribeToNewsletter(email: string, source: 'footer' | 'homepage' = 'footer') {
  return apiFetch<{ ok: true }>('/newsletter', {
    method: 'POST',
    revalidate: false,
    body: JSON.stringify({ email, source }),
  })
}
