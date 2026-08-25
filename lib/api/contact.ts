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
