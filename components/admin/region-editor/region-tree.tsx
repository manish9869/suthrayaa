'use client'

import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  ClipboardPaste,
  Combine,
  Copy,
  Eye,
  EyeOff,
  Folder,
  FolderPlus,
  Lock,
  MoreHorizontal,
  Palette,
  Plus,
  Scissors,
  Trash2,
  Ungroup,
  Unlock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { EditorRegion, EditorState } from '@/lib/preview/region-ops'

export interface RegionDetails {
  area: number
  dominant: { hex: string; share: number }[]
  overlaps: string[]
  layer: number
}

interface Props {
  state: EditorState
  activeId: string | null
  activeGroupId: string | null
  selectedIds: string[]
  coverage: (id: string) => number
  inspect: boolean
  details: Map<string, RegionDetails> | null
  canPaste: boolean
  onSelect: (id: string, additive: boolean) => void
  onSelectGroup: (id: string) => void
  onHover: (id: string | null) => void
  onPatch: (id: string, patch: Partial<EditorRegion>) => void
  onReorder: (id: string, dir: -1 | 1) => void
  onDelete: (ids: string[]) => void
  onDuplicate: (id: string) => void
  onSplit: (id: string) => void
  onCopySettings: (id: string) => void
  onPasteSettings: (ids: string[]) => void
  onGroupSelected: () => void
  onMergeSelected: () => void
  /** Merge region `id` into `targetId` (which keeps its name and settings). */
  onMergeInto: (id: string, targetId: string) => void
  onUngroup: (groupId: string) => void
  onAddRegion: () => void
}

export function RegionTree(p: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const { state } = p
  const ungrouped = state.regions.filter((r) => !r.groupId || !state.groups.some((g) => g.id === r.groupId))
  const multi = p.selectedIds.length > 1

  const row = (r: EditorRegion, nested: boolean) => {
    const active = p.activeId === r.id
    const selected = p.selectedIds.includes(r.id)
    const d = p.details?.get(r.id)
    return (
      <li key={r.id}>
        <div
          onMouseEnter={() => p.onHover(r.id)}
          onMouseLeave={() => p.onHover(null)}
          onClick={(e) => p.onSelect(r.id, e.shiftKey || e.ctrlKey || e.metaKey)}
          className={cn(
            'group/row flex cursor-pointer items-center gap-2 rounded-md py-1 pl-1.5 pr-1 text-sm transition-colors',
            nested && 'ml-4',
            active ? 'bg-primary/10 ring-1 ring-primary' : selected ? 'bg-primary/5' : 'hover:bg-muted',
            r.hidden && 'opacity-50'
          )}
        >
          <span className="relative h-5 w-5 shrink-0 rounded-full ring-1 ring-border" style={{ background: r.hex }} />
          <span className="min-w-0 flex-1 truncate">{r.name || 'Unnamed'}</span>
          {!r.changeable && (
            <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground" title="Fixed — never recoloured">
              fixed
            </span>
          )}
          <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{(p.coverage(r.id) * 100).toFixed(p.coverage(r.id) < 0.1 ? 1 : 0)}%</span>
          <button
            type="button"
            title={r.hidden ? 'Show on canvas' : 'Hide on canvas'}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              p.onPatch(r.id, { hidden: !r.hidden })
            }}
          >
            {r.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            title={r.locked ? 'Unlock' : 'Lock (protect from edits)'}
            className={cn('rounded p-0.5 hover:text-foreground', r.locked ? 'text-amber-600' : 'text-muted-foreground')}
            onClick={(e) => {
              e.stopPropagation()
              p.onPatch(r.id, { locked: !r.locked })
            }}
          >
            {r.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button type="button" className="rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onSelect={() => p.onPatch(r.id, { changeable: !r.changeable })} disabled={r.locked}>
                <Palette className="h-4 w-4" /> {r.changeable ? 'Make fixed' : 'Make changeable'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => p.onDuplicate(r.id)}>
                <Copy className="h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => p.onSplit(r.id)} disabled={r.locked}>
                <Scissors className="h-4 w-4" /> Split into separate pieces
              </DropdownMenuItem>
              {state.regions.length > 1 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={r.locked} className="data-[disabled]:opacity-50">
                    <Combine className="h-4 w-4" /> Merge into
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-72 w-48 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    {state.regions
                      .filter((x) => x.id !== r.id && !x.locked)
                      .map((x) => (
                        <DropdownMenuItem key={x.id} onSelect={() => p.onMergeInto(r.id, x.id)}>
                          <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-border" style={{ background: x.hex }} />
                          <span className="truncate">{x.name}</span>
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => p.onCopySettings(r.id)}>
                <ClipboardCopy className="h-4 w-4" /> Copy settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => p.onPasteSettings([r.id])} disabled={!p.canPaste || r.locked}>
                <ClipboardPaste className="h-4 w-4" /> Paste settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => p.onReorder(r.id, 1)}>
                <ArrowUp className="h-4 w-4" /> Bring forward
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => p.onReorder(r.id, -1)}>
                <ArrowDown className="h-4 w-4" /> Send backward
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => p.onDelete([r.id])} disabled={r.locked} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {p.inspect && d && (
          <div className={cn('mb-1 mt-0.5 space-y-0.5 rounded bg-muted/60 px-2 py-1 text-[10.5px] leading-snug text-muted-foreground', nested ? 'ml-11' : 'ml-7')}>
            <p className="font-mono">
              #{d.layer + 1} · id {r.id.slice(0, 8)} · {d.area.toLocaleString()} px
            </p>
            <p className="flex items-center gap-1">
              Photo colours:
              {d.dominant.map((c) => (
                <span key={c.hex} className="inline-flex items-center gap-0.5">
                  <span className="h-2.5 w-2.5 rounded-full ring-1 ring-border" style={{ background: c.hex }} />
                  {Math.round(c.share * 100)}%
                </span>
              ))}
            </p>
            <p>
              {r.changeable ? `${r.colorIds ? r.colorIds.length : 'inherited'} colours` : 'fixed'}
              {r.allowOverlap ? ' · may overlap' : ''}
              {d.overlaps.length > 0 && <span className="text-amber-700"> · overlaps {d.overlaps.join(', ')}</span>}
            </p>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Regions</p>
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={p.onAddRegion} title="Start a new region, then select its area on the photo">
            <Plus className="h-3.5 w-3.5" /> Region
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={p.onGroupSelected} disabled={p.selectedIds.length === 0} title="Put the selected regions into a group (Shift/Ctrl-click to select several)">
            <FolderPlus className="h-3.5 w-3.5" /> Group
          </Button>
        </div>
      </div>

      {multi && (
        <div className="flex flex-wrap items-center gap-1 rounded-md bg-primary/5 px-2 py-1.5 text-xs">
          <span className="mr-auto font-medium">{p.selectedIds.length} selected</span>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={p.onGroupSelected}>
            <FolderPlus className="h-3.5 w-3.5" /> Group
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={p.onMergeSelected}>
            <Combine className="h-3.5 w-3.5" /> Merge
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => p.onPasteSettings(p.selectedIds)} disabled={!p.canPaste}>
            <ClipboardPaste className="h-3.5 w-3.5" /> Paste settings
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={() => p.onDelete(p.selectedIds)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      )}

      {state.regions.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
          No regions yet. Add suggested ones below, or pick a tool and select an area on the photo.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {state.groups.map((g) => {
            const members = state.regions.filter((r) => r.groupId === g.id)
            const open = !collapsed.has(g.id)
            return (
              <li key={g.id}>
                <div
                  onClick={() => p.onSelectGroup(g.id)}
                  className={cn('flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-sm', p.activeGroupId === g.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted')}
                >
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      setCollapsed((c) => {
                        const n = new Set(c)
                        if (n.has(g.id)) n.delete(g.id)
                        else n.add(g.id)
                        return n
                      })
                    }}
                    aria-label={open ? 'Collapse' : 'Expand'}
                  >
                    {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  <Folder className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate font-medium">{g.name}</span>
                  <span className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">{g.sharedColor ? 'one colour' : 'each own colour'}</span>
                  <span className="text-[11px] text-muted-foreground">{members.length}</span>
                  <button
                    type="button"
                    title="Ungroup"
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      p.onUngroup(g.id)
                    }}
                  >
                    <Ungroup className="h-3.5 w-3.5" />
                  </button>
                </div>
                {open && <ul className="mt-0.5 space-y-0.5">{members.map((r) => row(r, true))}</ul>}
              </li>
            )
          })}
          {ungrouped.map((r) => row(r, false))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground">Same colour split in two? Use ⋯ → Merge into, or Shift/Ctrl-click to select several and Merge. Later regions in the list are drawn on top where regions may overlap.</p>
    </div>
  )
}
