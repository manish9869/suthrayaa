/** Shared glassmorphic panel treatment for admin table/card containers — a translucent,
 * blurred surface over the dark admin background instead of a flat opaque card, so panels
 * read as "floating" over the page rather than as solid blocks. Reuse this across admin
 * pages so all tables/panels share one consistent surface language. */
export const GLASS_PANEL = 'rounded-xl border border-white/10 bg-card/60 backdrop-blur-xl shadow-xl shadow-black/20'

/** Downloads `rows` as a CSV file named `filename`. Values are stringified and
 * comma/quote/newline-escaped per RFC 4180; a BOM is prepended so Excel opens
 * non-ASCII (₹, etc.) correctly. */
export function exportRowsToCsv(filename: string, columns: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))]
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
