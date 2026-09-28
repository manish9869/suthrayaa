'use client'

import { useEffect } from 'react'
import type { ProductPreview } from '@/lib/data'
import { getPreviewTemplate } from '@/lib/preview/templates'
import { PhotoColorPreview } from '@/components/customize/photo-color-preview'

/**
 * Renders a product's live color preview in either mode.
 * `colors` maps a color customization group id -> chosen hex (missing = not chosen yet:
 * the template's default color, or the photo's original color, is shown instead).
 */
export function ColorPreview({
  preview,
  colors,
  alt,
  className,
  onError,
}: {
  preview: ProductPreview
  colors: Record<string, string | undefined>
  alt: string
  className?: string
  onError?: () => void
}) {
  const template = preview.mode === 'svg' ? getPreviewTemplate(preview.svgTemplate) : undefined
  const broken = preview.mode === 'svg' ? !template : !preview.baseUrl

  useEffect(() => {
    if (broken) onError?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broken])

  if (broken) return null

  if (template) {
    const zoneColors: Record<string, string> = Object.fromEntries(template.zones.map((z) => [z.key, z.defaultColor]))
    for (const layer of preview.layers) {
      const hex = colors[layer.customizationId]
      if (layer.zone && hex) zoneColors[layer.zone] = hex
    }
    const { Component } = template
    return (
      <div className={className} title={alt}>
        <Component colors={zoneColors} />
      </div>
    )
  }

  return (
    <PhotoColorPreview
      baseUrl={preview.baseUrl!}
      alt={alt}
      className={className}
      onError={onError}
      layers={preview.layers.filter((l) => l.maskUrl).map((l) => ({ maskUrl: l.maskUrl!, hex: colors[l.customizationId] }))}
    />
  )
}

/** A preview-snapshot's layers (stored on an order line) as the `colors` map above. */
export function snapshotColors(layers: { customizationId: string; hex?: string }[]) {
  return Object.fromEntries(layers.map((l) => [l.customizationId, l.hex]))
}
