'use client'

import { useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AccessDeniedProps {
  /** "full" = whole-screen (not an admin at all, outside the sidebar shell). "inline" = rendered
   * inside the dashboard shell for a single unpermitted route — sidebar/nav stay visible. */
  variant?: 'full' | 'inline'
  title?: string
  message?: string
  actionLabel?: string
  onAction?: () => void
}

/** The spec-mandated 403 page: never redirect straight to the dashboard, never render the
 * protected data — just tell the admin plainly that this account can't do this. */
export function AccessDenied({
  variant = 'inline',
  title = 'Access Denied',
  message = "You don't have permission to access this page.",
  actionLabel,
  onAction,
}: AccessDeniedProps) {
  const router = useRouter()
  const handleAction = onAction ?? (() => router.back())
  const label = actionLabel ?? (variant === 'full' ? 'Back to Store' : 'Go Back')

  const content = (
    <div className="flex flex-col items-center justify-center gap-4 text-center px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-7 w-7" />
      </div>
      {variant === 'inline' && <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">403</p>}
      <h1 className="text-2xl font-serif font-bold text-foreground">{title}</h1>
      <p className="max-w-sm text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={variant === 'full' ? () => router.push('/') : handleAction}>
        {label}
      </Button>
    </div>
  )

  if (variant === 'full') {
    return <div className="dark min-h-screen flex items-center justify-center bg-background text-foreground">{content}</div>
  }
  return <div className="flex min-h-[60vh] items-center justify-center">{content}</div>
}
