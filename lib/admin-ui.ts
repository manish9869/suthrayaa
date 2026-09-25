/** Shared surface treatment for admin table/card containers — a white (or charcoal, in dark
 * mode) rounded panel with a hairline border and a soft, low shadow so panels lift gently off
 * the canvas. Reuse this across admin pages so all tables/panels share one surface language.
 * (The name is historical; the panels are no longer translucent.) */
export const GLASS_PANEL =
  'admin-panel rounded-[1.1rem] border bg-card text-card-foreground'

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
