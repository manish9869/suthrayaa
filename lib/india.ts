// Mirrors suthrayaa-backend/src/modules/settings/india.data.ts — keep both in sync. The
// backend is always the authority; these are for client-side dropdowns/validation UX only.

export interface IndiaStateEntry {
  name: string;
  code: string;
  isUnionTerritory: boolean;
}

export const INDIA_STATES: IndiaStateEntry[] = [
  { name: "Andhra Pradesh", code: "37", isUnionTerritory: false },
  { name: "Arunachal Pradesh", code: "12", isUnionTerritory: false },
  { name: "Assam", code: "18", isUnionTerritory: false },
  { name: "Bihar", code: "10", isUnionTerritory: false },
  { name: "Chhattisgarh", code: "22", isUnionTerritory: false },
  { name: "Goa", code: "30", isUnionTerritory: false },
  { name: "Gujarat", code: "24", isUnionTerritory: false },
  { name: "Haryana", code: "06", isUnionTerritory: false },
  { name: "Himachal Pradesh", code: "02", isUnionTerritory: false },
  { name: "Jharkhand", code: "20", isUnionTerritory: false },
  { name: "Karnataka", code: "29", isUnionTerritory: false },
  { name: "Kerala", code: "32", isUnionTerritory: false },
  { name: "Madhya Pradesh", code: "23", isUnionTerritory: false },
  { name: "Maharashtra", code: "27", isUnionTerritory: false },
  { name: "Manipur", code: "14", isUnionTerritory: false },
  { name: "Meghalaya", code: "17", isUnionTerritory: false },
  { name: "Mizoram", code: "15", isUnionTerritory: false },
  { name: "Nagaland", code: "13", isUnionTerritory: false },
  { name: "Odisha", code: "21", isUnionTerritory: false },
  { name: "Punjab", code: "03", isUnionTerritory: false },
  { name: "Rajasthan", code: "08", isUnionTerritory: false },
  { name: "Sikkim", code: "11", isUnionTerritory: false },
  { name: "Tamil Nadu", code: "33", isUnionTerritory: false },
  { name: "Telangana", code: "36", isUnionTerritory: false },
  { name: "Tripura", code: "16", isUnionTerritory: false },
  { name: "Uttar Pradesh", code: "09", isUnionTerritory: false },
  { name: "Uttarakhand", code: "05", isUnionTerritory: false },
  { name: "West Bengal", code: "19", isUnionTerritory: false },
  { name: "Andaman and Nicobar Islands", code: "35", isUnionTerritory: true },
  { name: "Chandigarh", code: "04", isUnionTerritory: true },
  { name: "Dadra and Nagar Haveli and Daman and Diu", code: "26", isUnionTerritory: true },
  { name: "Delhi", code: "07", isUnionTerritory: true },
  { name: "Jammu and Kashmir", code: "01", isUnionTerritory: true },
  { name: "Ladakh", code: "38", isUnionTerritory: true },
  { name: "Lakshadweep", code: "31", isUnionTerritory: true },
  { name: "Puducherry", code: "34", isUnionTerritory: true },
]

export const INDIA_STATE_NAMES = INDIA_STATES.map((s) => s.name)

export function normalizeIndianMobile(value: string): string {
  const digits = value.replace(/[^\d]/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

export function isValidIndianMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizeIndianMobile(value))
}

export function isValidIndianPincode(value: string): boolean {
  return /^[1-9]\d{5}$/.test(value.trim())
}

export function isValidGstin(value: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value.trim().toUpperCase())
}

export function isValidPan(value: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.trim().toUpperCase())
}
