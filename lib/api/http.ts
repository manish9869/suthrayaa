// Isomorphic fetch wrapper — safe to import from both Server and Client Components.
// It never touches Supabase/next-headers itself; callers that need an authenticated
// request pass a bearer token explicitly (see lib/api/auth-header.ts for each context).

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api"

interface FetchOptions extends RequestInit {
  token?: string
  /** Next.js fetch cache/revalidate hint. false = always fresh (no-store). */
  revalidate?: number | false
}

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown
  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, revalidate, headers, ...rest } = options

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(revalidate === false ? { cache: "no-store" as const } : { next: { revalidate: revalidate ?? 60 } }),
  })

  if (res.status === 204) return undefined as T

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const message = body?.error?.message ?? `Request failed (${res.status})`
    throw new ApiError(res.status, message, body?.error?.code, body?.error?.details)
  }

  return body as T
}
