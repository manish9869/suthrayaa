'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ArrowUp, ArrowDown, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { PageLoader } from './loading-state'
import { Can } from './can'
import { getAdminHomepageSections, updateHomepageSection, type HomepageSection } from '@/lib/api/settings'

/** What each homepage section shows, which heading fields it uses, and where its body is edited. */
const SECTION_INFO: Record<string, { label: string; hint: string; heading: boolean; button?: boolean; manage?: { href: string; label: string } }> = {
  hero_banner: { label: 'Hero banner', hint: 'Rotating hero slides', heading: false, manage: { href: '/admin/hero-slides', label: 'Hero Slides' } },
  trust_badges: { label: 'Trust badges', hint: 'Four promise badges under the hero', heading: false, manage: { href: '/admin/storefront-content#home.trust_badges', label: 'Edit badges' } },
  featured_categories: { label: 'Shop by category', hint: 'Categories marked “Show on homepage”', heading: true, button: true, manage: { href: '/admin/categories', label: 'Categories' } },
  reels: { label: 'Reels', hint: 'Short product video clips', heading: true, button: true, manage: { href: '/admin/storefront-content#home.reels', label: 'Edit reels' } },
  featured_products: { label: 'Featured products', hint: 'Products marked “Featured”', heading: true, button: true, manage: { href: '/admin/products', label: 'Products' } },
  story: { label: 'Our story', hint: 'Brand story with images and stats', heading: false, manage: { href: '/admin/storefront-content#home.story', label: 'Edit story' } },
  new_arrivals: { label: 'New arrivals', hint: 'Products marked “New arrival”', heading: true, button: true, manage: { href: '/admin/products', label: 'Products' } },
  best_sellers: { label: 'Best sellers', hint: 'Products marked “Bestseller”', heading: true, button: true, manage: { href: '/admin/products', label: 'Products' } },
  convertible_showcase: { label: 'Feature showcase', hint: 'Animated 2-in-1 product feature', heading: false, manage: { href: '/admin/storefront-content#home.convertible', label: 'Edit showcase' } },
  trending: { label: 'Trending now', hint: 'Top-rated products', heading: true, button: true },
  sale_products: { label: 'On sale', hint: 'Products with a compare-at price above their price', heading: true, button: true },
  collections: { label: 'Collections', hint: 'Categories marked “Featured”', heading: true, button: true, manage: { href: '/admin/categories', label: 'Categories' } },
  promotional_banner: { label: 'Promo & coupon', hint: 'Sale banner, coupon card, deal of the day', heading: false, manage: { href: '/admin/storefront-content#home.promo', label: 'Edit promo' } },
  testimonials: { label: 'Testimonials', hint: 'Published testimonials carousel', heading: true, manage: { href: '/admin/testimonials', label: 'Testimonials' } },
  instagram: { label: 'Instagram', hint: 'Photo grid linking to Instagram', heading: true, manage: { href: '/admin/storefront-content#home.instagram', label: 'Edit photos' } },
  newsletter: { label: 'Newsletter signup', hint: 'Email signup card (also in the footer)', heading: true, manage: { href: '/admin/newsletter', label: 'Subscribers' } },
}

const infoFor = (key: string) =>
  SECTION_INFO[key] ?? { label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), hint: '', heading: true, button: true }

/** Homepage sections: toggle, reorder, and edit each section's heading. Reorder is a plain
 * sort_order swap via buttons (same pattern as category-manager.tsx). */
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
    // Equal sort orders would make a swap a no-op — fall back to index-based orders
    const [aOrder, bOrder] = a.sort_order === b.sort_order ? [target * 10, index * 10] : [b.sort_order, a.sort_order]
    await Promise.all([updateHomepageSection(a.id, { sortOrder: aOrder }), updateHomepageSection(b.id, { sortOrder: bOrder })])
    load()
  }

  const saveEdit = async (s: HomepageSection, patch: HeadingPatch) => {
    try {
      await updateHomepageSection(s.id, patch)
      setEditing(null)
      toast.success('Section updated')
      load()
    } catch {
      toast.error('Failed to update section')
    }
  }

  if (!sections) return <PageLoader label="Loading homepage sections..." />

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Turn sections on/off and set their order. Headings support <code>*asterisks*</code> for the italic accent word, e.g.{' '}
        <code>Featured *creations*</code>. Leave a field empty to use the built-in text.
      </p>
      <div className={`${GLASS_PANEL} divide-y`}>
        {sections.map((s, i) => {
          const info = infoFor(s.section_key)
          return (
            <div key={s.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Can permission="settings.storefront">
                    <div className="flex flex-col">
                      <button className="disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button className="disabled:opacity-30" disabled={i === sections.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Can>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{info.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.title ? `“${s.title.replace(/\*/g, '')}” · ` : ''}
                      {info.hint}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {info.manage && (
                    <Link href={info.manage.href} className="hidden items-center gap-1 text-xs text-primary hover:underline sm:inline-flex">
                      {info.manage.label} <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  <Can permission="settings.storefront">
                    {info.heading && (
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setEditing(editing === s.id ? null : s.id)}>
                        Edit heading
                      </Button>
                    )}
                    <Switch checked={s.enabled} onCheckedChange={() => toggle(s)} aria-label={`Show ${info.label}`} />
                  </Can>
                </div>
              </div>
              {editing === s.id && <SectionEditForm section={s} withButton={Boolean(info.button)} onSave={saveEdit} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

type HeadingPatch = { title: string; subtitle: string; description: string; buttonText?: string; buttonUrl?: string }

function SectionEditForm({
  section,
  withButton,
  onSave,
}: {
  section: HomepageSection
  withButton: boolean
  onSave: (s: HomepageSection, patch: HeadingPatch) => void
}) {
  const [title, setTitle] = useState(section.title ?? '')
  const [subtitle, setSubtitle] = useState(section.subtitle ?? '')
  const [description, setDescription] = useState(section.description ?? '')
  const [buttonText, setButtonText] = useState(section.button_text ?? '')
  const [buttonUrl, setButtonUrl] = useState(section.button_url ?? '')
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label className="text-xs">Eyebrow (small label above the title)</Label>
        <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Featured *creations*" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs">Description</Label>
        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {withButton && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Link label</Label>
            <Input value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="View all" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Link URL</Label>
            <Input value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} placeholder="/shop" />
          </div>
        </>
      )}
      <div className="sm:col-span-2">
        <Button
          size="sm"
          onClick={() => onSave(section, { title, subtitle, description, ...(withButton ? { buttonText, buttonUrl } : {}) })}
        >
          Save
        </Button>
      </div>
    </div>
  )
}
