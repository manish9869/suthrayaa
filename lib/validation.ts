// Client-side validation shared by checkout, the address book and account forms. The backend
// re-validates everything; these give instant, field-level feedback with the same rules.
import { INDIA_STATE_NAMES, isValidIndianMobile, isValidIndianPincode } from '@/lib/india'

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export interface AddressFields {
  firstName: string
  lastName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  landmark?: string
  city: string
  state: string
  pincode: string
}

export function validateAddress(a: AddressFields): FieldErrors<keyof AddressFields> {
  const e: FieldErrors<keyof AddressFields> = {}
  if (!a.firstName.trim()) e.firstName = 'First name is required'
  if (!a.lastName.trim()) e.lastName = 'Last name is required'
  if (!a.phone.trim()) e.phone = 'Mobile number is required'
  else if (!isValidIndianMobile(a.phone)) e.phone = 'Enter a valid 10-digit Indian mobile number'
  if (a.addressLine1.trim().length < 3) e.addressLine1 = 'Enter your house number and street'
  if (a.city.trim().length < 2) e.city = 'Enter your city'
  if (!a.state) e.state = 'Select your state'
  else if (!INDIA_STATE_NAMES.includes(a.state)) e.state = 'Select a valid state'
  if (!a.pincode.trim()) e.pincode = 'PIN code is required'
  else if (!isValidIndianPincode(a.pincode)) e.pincode = 'Enter a valid 6-digit PIN code'
  return e
}

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Email is required'
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address'
  return undefined
}

export interface PasswordCheck {
  label: string
  ok: boolean
}

/** Password rules shown live as a checklist (sign-up, change password, reset). */
export function passwordChecks(pw: string): PasswordCheck[] {
  return [
    { label: 'At least 8 characters', ok: pw.length >= 8 },
    { label: 'A letter', ok: /[A-Za-z]/.test(pw) },
    { label: 'A number', ok: /\d/.test(pw) },
  ]
}
export const isStrongPassword = (pw: string) => passwordChecks(pw).every((c) => c.ok)

/** 0–4 strength score for the meter. */
export function passwordStrength(pw: string): number {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(4, s)
}

export const hasErrors = (e: object) => Object.values(e).some(Boolean)
