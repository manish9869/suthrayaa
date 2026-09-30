'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

/**
 * Select several rows of an admin table and act on them at once. Actions run through the same
 * single-item API calls (so every server-side rule still applies to each item), a few at a
 * time, and report exactly which items didn't go through and why.
 */

export interface BulkResult {
  ok: string[]
  failed: { id: string; message: string }[]
}

export async function runBulk(ids: string[], action: (id: string) => Promise<unknown>, concurrency = 4): Promise<BulkResult> {
  const result: BulkResult = { ok: [], failed: [] }
  let next = 0
  const worker = async () => {
    while (next < ids.length) {
      const id = ids[next++]
      try {
        await action(id)
        result.ok.push(id)
      } catch (e) {
        result.failed.push({ id, message: e instanceof Error ? e.message : 'Something went wrong' })
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker))
  return result
}

/** Selected row ids, kept to the rows that still exist. */
export function useSelection(existingIds: string[]) {
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const existing = useMemo(() => new Set(existingIds), [existingIds])
  const selected = useMemo(() => [...picked].filter((id) => existing.has(id)), [picked, existing])
  const toggle = useCallback((id: string) => {
    setPicked((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }, [])
  /** Select these rows — or, if they're all selected already, unselect them. */
  const toggleAll = useCallback((ids: string[]) => {
    setPicked((s) => {
      const all = ids.length > 0 && ids.every((id) => s.has(id))
      const n = new Set(s)
      for (const id of ids) {
        if (all) n.delete(id)
        else n.add(id)
      }
      return n
    })
  }, [])
  const selectAll = useCallback((ids: string[]) => setPicked(new Set(ids)), [])
  const clear = useCallback(() => setPicked(new Set()), [])
  const isSelected = useCallback((id: string) => picked.has(id) && existing.has(id), [picked, existing])
  return { selected, toggle, toggleAll, selectAll, clear, isSelected }
}

/** Header checkbox for the rows on screen (shows "some" when only part of them are picked). */
export function SelectAllCheckbox({ ids, isSelected, onToggle }: { ids: string[]; isSelected: (id: string) => boolean; onToggle: () => void }) {
  const count = ids.filter(isSelected).length
  return (
    <Checkbox
      aria-label="Select all rows on this page"
      checked={count === 0 ? false : count === ids.length ? true : 'indeterminate'}
      onCheckedChange={onToggle}
      disabled={ids.length === 0}
    />
  )
}

/** Floating bar with the actions for the selected rows. */
export function BulkBar({ count, noun, onClear, busy, extra, children }: { count: number; noun: [string, string]; onClear: () => void; busy?: boolean; extra?: ReactNode; children: ReactNode }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl border bg-card/95 p-2 pl-4 shadow-[0_18px_50px_-18px_rgb(0_0_0/0.35)] backdrop-blur-xl"
          role="region"
          aria-label="Actions for selected rows"
        >
          <span className="mr-1 text-sm font-medium tabular-nums" aria-live="polite">
            {count} {count === 1 ? noun[0] : noun[1]} selected
          </span>
          {extra}
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {children}
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClear} disabled={busy} aria-label="Clear selection" title="Clear selection">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** One-line summary of a bulk run, naming what failed (first few) with the reason. */
export function bulkSummary(result: BulkResult, doneLabel: string, nameOf: (id: string) => string): { ok: boolean; message: string } {
  const failed = result.failed.slice(0, 3).map((f) => `${nameOf(f.id)}: ${f.message}`)
  const more = result.failed.length > 3 ? ` (+${result.failed.length - 3} more)` : ''
  if (!result.failed.length) return { ok: true, message: `${result.ok.length} ${doneLabel}` }
  return {
    ok: false,
    message: `${result.ok.length} ${doneLabel}; ${result.failed.length} not changed — ${failed.join(' · ')}${more}`,
  }
}
