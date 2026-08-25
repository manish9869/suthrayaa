import { useEffect, useMemo, useState } from 'react'

/** Client-side pagination over an already-loaded array. Resets to page 1 whenever the
 * underlying data length changes (e.g. a filter/sort narrows the set) so the page never
 * points past the end of a freshly-filtered list. */
export function usePaginated<T>(data: T[], pageSize = 20) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(data.length / pageSize))

  useEffect(() => {
    setPage(1)
  }, [data.length])

  const safePage = Math.min(page, pageCount)
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [data, safePage, pageSize])

  return { pageItems, page: safePage, setPage, pageCount, total: data.length }
}
