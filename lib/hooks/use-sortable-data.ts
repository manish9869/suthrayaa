import { useMemo, useState } from 'react'

export type SortDirection = 'asc' | 'desc'

/**
 * Generic client-side column sort. Accessors are keyed by column id so a header can sort by
 * a computed/derived value (e.g. a formatted name) rather than being limited to raw object keys.
 */
export function useSortableData<T>(
  data: T[],
  accessors: Record<string, (item: T) => string | number | null | undefined>,
  initial?: { key: string; direction: SortDirection }
) {
  const [sortKey, setSortKey] = useState<string | null>(initial?.key ?? null)
  const [direction, setDirection] = useState<SortDirection>(initial?.direction ?? 'asc')

  const sorted = useMemo(() => {
    if (!sortKey || !accessors[sortKey]) return data
    const accessor = accessors[sortKey]
    const withKeys = data.map((item) => ({ item, value: accessor(item) }))
    withKeys.sort((a, b) => {
      if (a.value == null && b.value == null) return 0
      if (a.value == null) return 1
      if (b.value == null) return -1
      let cmp: number
      if (typeof a.value === 'number' && typeof b.value === 'number') {
        cmp = a.value - b.value
      } else {
        cmp = String(a.value).localeCompare(String(b.value), undefined, { sensitivity: 'base' })
      }
      return direction === 'asc' ? cmp : -cmp
    })
    return withKeys.map((w) => w.item)
  }, [data, accessors, sortKey, direction])

  const toggleSort = (key: string) => {
    if (key !== sortKey) {
      setSortKey(key)
      setDirection('asc')
    } else {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    }
  }

  return { sorted, sortKey, direction, toggleSort }
}
