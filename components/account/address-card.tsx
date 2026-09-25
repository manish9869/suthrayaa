import { Briefcase, Home, MapPin, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AddressLike {
  firstName: string
  lastName: string
  phone?: string | null
  addressLine1: string
  addressLine2?: string | null
  landmark?: string | null
  city: string
  state: string
  pincode: string
  addressType?: 'home' | 'work' | 'other' | null
  label?: string | null
}

const TYPE_ICON = { home: Home, work: Briefcase, other: MapPin }

export function formatPhone(p?: string | null) {
  if (!p) return ''
  const d = p.replace(/\D/g, '').slice(-10)
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : p
}

/** The address itself (name, lines, phone) — shared by the address book, checkout and orders. */
export function AddressLines({ a, className, compact = false }: { a: AddressLike; className?: string; compact?: boolean }) {
  return (
    <div className={cn('text-sm leading-relaxed', className)}>
      <p className="font-semibold text-foreground">
        {a.firstName} {a.lastName}
      </p>
      <p className="text-muted-foreground">
        {a.addressLine1}
        {a.addressLine2 ? `, ${a.addressLine2}` : ''}
        {!compact && a.landmark ? `, near ${a.landmark}` : ''}
      </p>
      <p className="text-muted-foreground">
        {a.city}, {a.state} {a.pincode}
      </p>
      {a.phone && (
        <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
          <Phone className="h-3.5 w-3.5" /> {formatPhone(a.phone)}
        </p>
      )}
    </div>
  )
}

export function AddressTypeTag({ a }: { a: AddressLike }) {
  const Icon = TYPE_ICON[a.addressType ?? 'other'] ?? MapPin
  const text = a.label || (a.addressType ? a.addressType[0].toUpperCase() + a.addressType.slice(1) : 'Address')
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11.5px] font-medium text-foreground/75">
      <Icon className="h-3 w-3" /> {text}
    </span>
  )
}
