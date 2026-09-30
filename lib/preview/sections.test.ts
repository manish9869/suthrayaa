import { describe, expect, it } from 'vitest'
import { colourSections } from './sections'
import type { ProductCustomization, ProductPreview } from '@/lib/data'

const opt = (id: string, label: string, type: ProductCustomization['type'] = 'color'): ProductCustomization =>
  ({ id, name: id, label, type, required: false, enabled: true, sortOrder: 0, values: [] }) as ProductCustomization

const layer = (id: string, customizationId: string, sortOrder: number, groupId?: string) => ({ id, customizationId, sortOrder, groupId, maskUrl: `m-${id}` })

describe('customer colour controls', () => {
  it('turns a shared group into one control and an individual group into a headed list', () => {
    const preview: ProductPreview = {
      mode: 'photo',
      baseUrl: 'b',
      groups: [
        { id: 'g1', name: 'Flowers', sharedColor: true, sortOrder: 0 },
        { id: 'g2', name: 'Decorative balls', sharedColor: false, sortOrder: 1 },
      ],
      layers: [
        layer('f1', 'oFlowers', 0, 'g1'),
        layer('f2', 'oFlowers', 1, 'g1'),
        layer('f3', 'oFlowers', 2, 'g1'),
        layer('b1', 'oBall1', 3, 'g2'),
        layer('b2', 'oBall2', 4, 'g2'),
        layer('border', 'oBorder', 5),
      ],
    }
    const custom = [opt('size', 'Size', 'choice'), opt('oFlowers', 'Flowers'), opt('oBall1', 'Ball 1'), opt('oBall2', 'Ball 2'), opt('oBorder', 'Border'), opt('legacy', 'Old colour')]
    const sections = colourSections(custom, preview)
    expect(sections.map((s) => [s.title, s.options.map((o) => o.label)])).toEqual([
      [undefined, ['Flowers']],
      ['Decorative balls', ['Ball 1', 'Ball 2']],
      [undefined, ['Border']],
      [undefined, ['Old colour']],
    ])
  })

  it('works with no preview at all (plain colour options)', () => {
    expect(colourSections([opt('a', 'Main colour'), opt('b', 'Size', 'choice')])).toEqual([{ options: [expect.objectContaining({ label: 'Main colour' })] }])
  })

  it('skips disabled options and never lists one twice', () => {
    const disabled = { ...opt('x', 'Hidden'), enabled: false }
    const preview: ProductPreview = { mode: 'photo', layers: [layer('1', 'a', 0), layer('2', 'a', 1), layer('3', 'x', 2)], groups: [] }
    expect(colourSections([opt('a', 'Body'), disabled], preview)).toEqual([{ options: [expect.objectContaining({ label: 'Body' })] }])
  })
})
