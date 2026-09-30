import { adminFetch } from './admin'

/** Admin → Insights: GA4 + store analytics. Mirrors the backend's block format. */

export type Format = 'money' | 'number' | 'percent' | 'duration' | 'ms' | 'decimal' | 'text'
export type Source = 'store' | 'ga4' | 'mixed'

export interface Kpi {
  key: string
  label: string
  value: number | null
  previous: number | null
  change: number | null
  format: Format
  source: Source
  goodWhenUp?: boolean
  hint?: string
}
export interface SeriesMetric {
  key: string
  label: string
  format: Format
  source: Source
}
export interface SeriesPoint {
  key: string
  label: string
  values: Record<string, number | null>
  previous?: Record<string, number | null>
  previousLabel?: string
}
export interface Column {
  key: string
  label: string
  format?: Format
  align?: 'left' | 'right'
}
export type Row = Record<string, string | number | null>

export type Block =
  | { type: 'kpis'; id: string; title?: string; items: Kpi[] }
  | { type: 'series'; id: string; title: string; description?: string; metrics: SeriesMetric[]; points: SeriesPoint[]; chart?: 'line' | 'bar' }
  | { type: 'table'; id: string; title: string; description?: string; columns: Column[]; rows: Row[]; source: Source; empty?: string }
  | { type: 'funnel'; id: string; title: string; description?: string; steps: { label: string; value: number; previous?: number | null }[]; source: Source }
  | { type: 'breakdown'; id: string; title: string; description?: string; format: Format; source: Source; items: { label: string; value: number; previous?: number | null; share: number }[] }
  | { type: 'heatmap'; id: string; title: string; description?: string; rowLabels: string[]; colLabels: string[]; values: number[][]; format: Format; source: Source }
  | { type: 'insights'; id: string; title?: string; items: { tone: 'good' | 'bad' | 'neutral'; text: string }[] }
  | { type: 'notice'; id: string; tone: 'info' | 'warning' | 'error'; text: string }

export interface SectionResult {
  section: string
  title: string
  period: { from: string; to: string; compareFrom: string | null; compareTo: string | null; granularity: 'day' | 'week' | 'month'; tz: string }
  ga: { configured: boolean; connected: boolean; error?: string }
  filterNotes: string[]
  blocks: Block[]
  refresh?: number
}

export interface InsightsStatus {
  connected: boolean
  configured: boolean
  propertyId: string | null
  measurementId: string | null
  tracking: boolean
  error?: string
  code?: string
}

export interface FilterOptions {
  labels: Record<string, string>
  options: Record<string, { value: string; label: string }[]>
}

export const getInsightsSection = (section: string, query: string) => adminFetch<SectionResult>(`/admin/insights/${section}?${query}`)
export const getInsightsStatus = () => adminFetch<InsightsStatus>('/admin/insights/status')
export const getInsightsOptions = () => adminFetch<FilterOptions>('/admin/insights/options')
export const getInsightsAlertCount = (query = '') => adminFetch<{ count: number }>(`/admin/insights/alerts/count?${query}`)
