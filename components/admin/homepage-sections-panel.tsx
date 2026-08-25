'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { PageLoader } from './loading-state'
import { Can } from './can'
import { getAdminHomepageSections, updateHomepageSection, type HomepageSection } from '@/lib/api/settings'

function sectionLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Homepage sections toggle/reorder — reorder is a plain sort_order swap via buttons,
 * matching this codebase's existing "reorder" pattern (category-manager.tsx) rather than
 * introducing a drag-and-drop library. */
export function HomepageSectionsPanel() {
  const [sections, setSections] = useState<HomepageSection[] | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  const load = () => getAdminHomepageSections().then((s) => setSections(s.slice().sort((a, b) => a.sort_order - b.sort_order)))
  useEffect(() => {
    load()
  }, [])

  const toggle = async (s: HomepageSection) => {
    await updateHomepageSection(s.id, { enabled: !s.enabled })
    load()
  }

  const move = async (index: number, direction: -1 | 1) => {
    if (!sections) return
    const target = index + direction
    if (target < 0 || target >= sections.length) return
    const a = sections[index]
    const b = sections[target]
    await Promise.all([updateHomepageSection(a.id, { sortOrder: b.sort_order }), updateHomepageSection(b.id, { sortOrder: a.sort_order })])
    load()
  }

  const saveEdit = async (s: HomepageSection, title: string, subtitle: string) => {
    await updateHomepageSection(s.id, { title, subtitle })
    setEditing(null)
    toast.success('Section updated')
    load()
  }

  if (!sections) return <PageLoader label="Loading homepage sections..." />

  return (
    <div className={`${GLASS_PANEL} divide-y`}>
      {sections.map((s, i) => (
        <div key={s.id} className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <button className="disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button className="disabled:opacity-30" disabled={i === sections.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <p className="text-sm font-medium">{sectionLabel(s.section_key)}</p>
                {s.title && <p className="text-xs text-muted-foreground">{s.title}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Can permission="settings.storefront">
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setEditing(editing === s.id ? null : s.id)}>
                  Edit heading
                </Button>
                <Switch checked={s.enabled} onCheckedChange={() => toggle(s)} />
              </Can>
            </div>
          </div>
          {editing === s.id && <SectionEditForm section={s} onSave={saveEdit} />}
        </div>
      ))}
    </div>
  )
}

function SectionEditForm({ section, onSave }: { section: HomepageSection; onSave: (s: HomepageSection, title: string, subtitle: string) => void }) {
  const [title, setTitle] = useState(section.title ?? '')
  const [subtitle, setSubtitle] = useState(section.subtitle ?? '')
  return (
    <div className="mt-3 grid gap-3 rounded-md border p-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label className="text-xs">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Subtitle</Label>
        <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Button size="sm" onClick={() => onSave(section, title, subtitle)}>
          Save
        </Button>
      </div>
    </div>
  )
}
