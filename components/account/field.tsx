import { AlertCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** Label + control + inline error/hint — the one field layout used by every customer form. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  optional?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-[13px] font-medium text-foreground/85">
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="flex items-center gap-1.5 text-[12.5px] font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

/** Props that mark an input invalid for styling + screen readers. */
export const invalidProps = (id: string, error?: string) =>
  error
    ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error`, className: 'border-destructive focus-visible:ring-destructive/25' }
    : {}
