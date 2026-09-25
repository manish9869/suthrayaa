import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes a post-login `redirect`/`next` value to a same-site path. Anything that could
 * leave the site — absolute URLs, protocol-relative `//host`, `/\host`, or `@host` (which
 * turns `${origin}${next}` into userinfo@host) — falls back to `/`.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}
