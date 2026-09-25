'use client'

import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Briefcase, Home, MapPin } from 'lucide-react'
import { INDIA_STATE_NAMES } from '@/lib/india'
import type { FieldErrors } from '@/lib/validation'
import { cn } from '@/lib/utils'
import { Field, invalidProps } from './field'

export interface AddressDraft {
  label: string
  firstName: string
  lastName: string
  phone: string
  addressLine1: string
  addressLine2: string
  landmark: string
  city: string
  state: string
  pincode: string
  addressType: 'home' | 'work' | 'other'
  isDefault: boolean
  isDefaultBilling: boolean
}

export const EMPTY_ADDRESS: AddressDraft = {
  label: '',
  firstName: '',
  lastName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  addressType: 'home',
  isDefault: false,
  isDefaultBilling: false,
}

const TYPES = [
  { value: 'home', label: 'Home', icon: Home },
  { value: 'work', label: 'Work', icon: Briefcase },
  { value: 'other', label: 'Other', icon: MapPin },
] as const

/**
 * Indian address form used by the address book and checkout. Controlled: the parent owns the
 * draft and the errors (see validateAddress), so both places validate the same way.
 */
export function AddressForm({
  value,
  onChange,
  errors = {},
  idPrefix = 'addr',
  showType = true,
  showDefaults = false,
  onBlurField,
}: {
  value: AddressDraft
  onChange: (next: AddressDraft) => void
  errors?: FieldErrors<keyof AddressDraft>
  idPrefix?: string
  showType?: boolean
  showDefaults?: boolean
  onBlurField?: (field: keyof AddressDraft) => void
}) {
  const set = <K extends keyof AddressDraft>(k: K, v: AddressDraft[K]) => onChange({ ...value, [k]: v })
  const id = (k: string) => `${idPrefix}-${k}`
  const text = (k: keyof AddressDraft, props: React.ComponentProps<typeof Input> = {}) => {
    const inv = invalidProps(id(k), errors[k])
    return (
      <Input
        id={id(k)}
        value={value[k] as string}
        onChange={(e) => set(k, e.target.value as never)}
        onBlur={() => onBlurField?.(k)}
        {...props}
        {...inv}
        className={cn('h-11 rounded-xl bg-card', inv.className, props.className)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor={id('firstName')} error={errors.firstName}>
          {text('firstName', { autoComplete: 'given-name' })}
        </Field>
        <Field label="Last name" htmlFor={id('lastName')} error={errors.lastName}>
          {text('lastName', { autoComplete: 'family-name' })}
        </Field>
      </div>
      <Field label="Mobile number" htmlFor={id('phone')} error={errors.phone} hint="For delivery updates from the courier">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+91</span>
          {text('phone', {
            type: 'tel',
            inputMode: 'numeric',
            autoComplete: 'tel-national',
            placeholder: '98765 43210',
            maxLength: 14,
            className: 'pl-12',
          })}
        </div>
      </Field>
      <Field label="Flat, house no., building, street" htmlFor={id('addressLine1')} error={errors.addressLine1}>
        {text('addressLine1', { autoComplete: 'address-line1', placeholder: '12 Lotus Apartments, MG Road' })}
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Area / locality" htmlFor={id('addressLine2')} optional>
          {text('addressLine2', { autoComplete: 'address-line2', placeholder: 'Koregaon Park' })}
        </Field>
        <Field label="Landmark" htmlFor={id('landmark')} optional>
          {text('landmark', { placeholder: 'Near City Mall' })}
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="PIN code" htmlFor={id('pincode')} error={errors.pincode}>
          {text('pincode', {
            inputMode: 'numeric',
            autoComplete: 'postal-code',
            placeholder: '411001',
            maxLength: 6,
            onChange: (e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6)),
          })}
        </Field>
        <Field label="City" htmlFor={id('city')} error={errors.city}>
          {text('city', { autoComplete: 'address-level2', placeholder: 'Pune' })}
        </Field>
        <Field label="State" htmlFor={id('state')} error={errors.state}>
          <Select
            value={value.state}
            onValueChange={(v) => {
              set('state', v)
              onBlurField?.('state')
            }}
          >
            <SelectTrigger
              id={id('state')}
              aria-invalid={errors.state ? true : undefined}
              className={cn('h-11 w-full rounded-xl bg-card', errors.state && 'border-destructive')}
            >
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {INDIA_STATE_NAMES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {showType && (
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-foreground/85">Save as</p>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => set('addressType', t.value)}
                aria-pressed={value.addressType === t.value}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                  value.addressType === t.value ? 'border-primary bg-primary/10 text-primary' : 'bg-card hover:border-primary/40'
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showDefaults && (
        <div className="space-y-2.5 rounded-xl bg-muted/50 p-3.5">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox checked={value.isDefault} onCheckedChange={(c) => set('isDefault', c === true)} />
            Default shipping address
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox checked={value.isDefaultBilling} onCheckedChange={(c) => set('isDefaultBilling', c === true)} />
            Default billing address
          </label>
        </div>
      )}
    </div>
  )
}
