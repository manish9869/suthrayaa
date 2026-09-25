'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, RotateCcw, Save, LayoutTemplate } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getAdminContent, saveAdminContent, resetAdminContent, type ContentBlockAdmin } from '@/lib/api/admin'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { PageHeader } from '@/components/admin/page-header'
import { PageLoader } from '@/components/admin/loading-state'
import { EmptyState } from '@/components/admin/admin-bits'
import { ContentFieldsForm } from '@/components/admin/content-fields-form'
import { useRbac } from '@/lib/rbac/rbac-context'
import { cn } from '@/lib/utils'

const GROUP_ORDER = ['Homepage', 'Pages', 'Policies', 'Site-wide', 'Footer']

export default function StorefrontContentPage() {
  const { hasPermission } = useRbac()
  const canEdit = hasPermission('content.update')
  const [blocks, setBlocks] = useState<ContentBlockAdmin[] | null>(null)
  const [icons, setIcons] = useState<string[]>([])
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAdminContent()
      .then(({ blocks, icons }) => {
        setBlocks(blocks)
        setIcons(icons)
        const fromHash = typeof window !== 'undefined' ? decodeURIComponent(window.location.hash.slice(1)) : ''
        const first = blocks.find((b) => b.key === fromHash) ?? blocks[0]
        if (first) {
          setActiveKey(first.key)
          setDraft(first.value)
        }
      })
      .catch(() => {
        setBlocks([])
        toast.error('Failed to load storefront content')
      })
  }, [])

  const active = blocks?.find((b) => b.key === activeKey) ?? null
  const dirty = useMemo(() => Boolean(active && draft && JSON.stringify(draft) !== JSON.stringify(active.value)), [active, draft])

  // Warn before leaving the page with unsaved edits
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const grouped = useMemo(() => {
    const map = new Map<string, ContentBlockAdmin[]>()
    for (const b of blocks ?? []) map.set(b.group, [...(map.get(b.group) ?? []), b])
    return [...map.entries()].sort(([a], [b]) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b))
  }, [blocks])

  const select = (b: ContentBlockAdmin) => {
    if (b.key === activeKey) return
    if (dirty && !confirm('You have unsaved changes. Discard them?')) return
    setActiveKey(b.key)
    setDraft(b.value)
    history.replaceState(null, '', `#${b.key}`)
  }

  const applySaved = (key: string, value: Record<string, unknown>, customized: boolean) => {
    setBlocks((prev) => prev?.map((b) => (b.key === key ? { ...b, value, customized, updatedAt: new Date().toISOString() } : b)) ?? prev)
    setDraft(value)
  }

  const save = async () => {
    if (!active || !draft) return
    setSaving(true)
    try {
      const res = await saveAdminContent(active.key, draft)
      applySaved(active.key, res.value, true)
      toast.success(`${active.label} saved — live on the storefront within a minute`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    if (!active) return
    if (!confirm(`Reset “${active.label}” to its original content? Your edits to this block will be lost.`)) return
    setSaving(true)
    try {
      const res = await resetAdminContent(active.key)
      applySaved(active.key, res.value, false)
      toast.success('Restored the original content')
    } catch {
      toast.error('Failed to reset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute permission="content.view">
      <div className="space-y-6">
        <PageHeader
          title="Storefront Content"
          description="Edit the copy, images and lists shown across the customer site. Section order and headings live in Site Settings → Homepage; products, categories, testimonials and hero slides have their own pages."
        />

        {!blocks ? (
          <PageLoader />
        ) : blocks.length === 0 ? (
          <Card>
            <EmptyState icon={LayoutTemplate} title="No content blocks" description="The content API returned nothing — check the backend is up to date." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            <nav className="space-y-5 lg:sticky lg:top-4 lg:self-start" aria-label="Content blocks">
              {grouped.map(([group, items]) => (
                <div key={group}>
                  <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group}</p>
                  <ul className="space-y-0.5">
                    {items.map((b) => (
                      <li key={b.key}>
                        <button
                          type="button"
                          onClick={() => select(b)}
                          className={cn(
                            'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                            b.key === activeKey ? 'bg-secondary font-medium text-secondary-foreground' : 'hover:bg-accent'
                          )}
                        >
                          <span className="truncate">{b.label}</span>
                          {b.customized && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" title="Edited" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            {active && draft && (
              <Card className="gap-0 py-0">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold tracking-tight">{active.label}</h2>
                        <Badge variant={active.customized ? 'default' : 'secondary'}>{active.customized ? 'Edited' : 'Original'}</Badge>
                      </div>
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{active.description}</p>
                      {active.updatedAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Last saved {new Date(active.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0">
                      <a href={active.previewPath} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" /> View on site
                      </a>
                    </Button>
                  </div>

                  <div className="py-6">
                    <ContentFieldsForm fields={active.fields} value={draft} onChange={setDraft} icons={icons} disabled={!canEdit} />
                  </div>

                  {canEdit && (
                    <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-between gap-3 border-t bg-card/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:px-6">
                      <Button variant="ghost" size="sm" onClick={reset} disabled={saving || !active.customized}>
                        <RotateCcw className="h-4 w-4" /> Reset to original
                      </Button>
                      <div className="flex items-center gap-2">
                        {dirty && (
                          <Button variant="outline" size="sm" onClick={() => setDraft(active.value)} disabled={saving}>
                            Discard changes
                          </Button>
                        )}
                        <Button onClick={save} disabled={saving || !dirty}>
                          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
