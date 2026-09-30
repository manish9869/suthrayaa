'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { SectionView } from '@/components/admin/insights/section-view'
import { INSIGHTS_NAV } from '@/components/admin/insights/nav'
import { SettingsGroupForm } from '@/components/admin/settings-group-form'
import { getAdminSettings, type SettingDef } from '@/lib/api/settings'

const SECTIONS = new Set(INSIGHTS_NAV.flatMap((g) => g.items.map((i) => i.id)).filter((id) => id && id !== 'reports' && id !== 'settings'))

/** The limits the Alerts page checks against (Admin settings group "insights"). */
function AlertLimits() {
  const [state, setState] = useState<{ catalog: SettingDef[]; values: Record<string, unknown> } | null>(null)
  const load = () =>
    getAdminSettings()
      .then((s) => setState({ catalog: s.catalog, values: s.values.insights ?? {} }))
      .catch(() => setState(null))
  useEffect(() => {
    load()
  }, [])
  if (!state) return null
  return (
    <div className="space-y-2 pt-2">
      <h3 className="text-sm font-semibold">Alert limits</h3>
      <p className="text-xs text-muted-foreground">When a check goes past its limit it shows as an alert here and as a red count in the Insights menu.</p>
      <SettingsGroupForm group="insights" catalog={state.catalog} values={state.values} onSaved={load} />
    </div>
  )
}

export default function InsightsSectionPage() {
  const { section } = useParams<{ section: string }>()
  if (!SECTIONS.has(section)) {
    return (
      <p className="text-sm text-muted-foreground">
        That Insights page doesn&apos;t exist.{' '}
        <Link href="/admin/insights" className="text-primary hover:underline">
          Go to the overview
        </Link>
      </p>
    )
  }
  return <SectionView section={section} after={section === 'alerts' ? <AlertLimits /> : undefined} />
}
