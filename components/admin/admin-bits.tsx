import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export function initialsOf(name: string | null | undefined) {
  return (name ?? '')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

/** Round initials avatar. `tone="brand"` is the warm gradient used for the signed-in admin and
 * featured people; the default is a quiet neutral chip for table rows. */
export function InitialsAvatar({
  name,
  size = 'md',
  tone = 'neutral',
  className,
}: {
  name: string | null | undefined
  size?: 'sm' | 'md' | 'lg'
  tone?: 'neutral' | 'brand'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        size === 'sm' && 'h-7 w-7 text-[10px]',
        size === 'md' && 'h-9 w-9 text-xs',
        size === 'lg' && 'h-12 w-12 text-sm',
        tone === 'brand' ? 'bg-gradient-to-br from-primary to-gold text-primary-foreground' : 'bg-muted text-muted-foreground',
        className
      )}
    >
      {initialsOf(name) || '?'}
    </span>
  )
}

/** Centered empty state for a list/table/grid with nothing to show. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-14 text-center', className)}>
      <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
