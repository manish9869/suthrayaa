'use client'

import { useId, type ReactNode } from 'react'

/**
 * Built-in illustrated templates for the live color preview. Each one is a hand-drawn SVG
 * whose colorable parts ("zones") are painted from the customer's color choices. They ship
 * as code (never uploaded) so there's no SVG-injection surface.
 *
 * Every part is drawn three times: flat color, a shared soft shading gradient, and a
 * crochet-stitch pattern — so any yarn color reads as a textured, rounded piece.
 */

export interface TemplateZone {
  key: string
  label: string
  defaultColor: string
}

export interface PreviewTemplate {
  key: string
  name: string
  zones: TemplateZone[]
  Component: (props: { colors: Record<string, string> }) => ReactNode
}

/* ---------- shared drawing helpers ---------- */

interface Ids {
  shade: string
  stitch: string
  shadow: string
}

function Defs({ ids }: { ids: Ids }) {
  return (
    <defs>
      <radialGradient id={ids.shade} cx="35%" cy="28%" r="80%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.38" />
        <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
      </radialGradient>
      <pattern id={ids.stitch} width="9" height="8" patternUnits="userSpaceOnUse">
        <path d="M0.5 1.5 L4.5 6 L8.5 1.5" fill="none" stroke="#000" strokeOpacity="0.16" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M0.5 0.4 L4.5 4.9 L8.5 0.4" fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="0.9" strokeLinecap="round" />
      </pattern>
      <filter id={ids.shadow} x="-10%" y="-10%" width="120%" height="125%">
        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#1f1a33" floodOpacity="0.18" />
      </filter>
    </defs>
  )
}

/** A filled, shaded, stitched part. */
function Part({ d, color, ids, transform }: { d: string; color: string; ids: Ids; transform?: string }) {
  return (
    <g transform={transform}>
      <path d={d} fill={color} />
      <path d={d} fill={`url(#${ids.shade})`} />
      <path d={d} fill={`url(#${ids.stitch})`} />
    </g>
  )
}

const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`
const circle = (cx: number, cy: number, r: number) => ellipse(cx, cy, r, r)

function Frame({ children }: { children: (ids: Ids) => ReactNode }) {
  const uid = useId().replace(/:/g, '')
  const ids: Ids = { shade: `sh-${uid}`, stitch: `st-${uid}`, shadow: `sd-${uid}` }
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-label="Design preview">
      <Defs ids={ids} />
      <g filter={`url(#${ids.shadow})`}>{children(ids)}</g>
    </svg>
  )
}

const METAL = '#b9b6c3'
const CORD = '#bba98f'

/* ---------- 5-petal flower ---------- */

function Flower({ colors }: { colors: Record<string, string> }) {
  return (
    <Frame>
      {(ids) => (
        <>
          <Part ids={ids} color={colors.stem} d="M194 182 Q186 280 195 388 L206 388 Q199 280 207 182 Z" />
          <Part ids={ids} color={colors.leaves} d="M198 292 C160 258 118 268 102 300 C138 318 176 314 198 292 Z" />
          <Part ids={ids} color={colors.leaves} d="M203 250 C242 216 284 228 300 258 C264 278 224 274 203 250 Z" />
          {[0, 72, 144, 216, 288].map((a) => (
            <Part key={a} ids={ids} color={colors.petals} d={ellipse(200, 92, 40, 60)} transform={`rotate(${a} 200 150)`} />
          ))}
          <Part ids={ids} color={colors.center} d={circle(200, 150, 34)} />
        </>
      )}
    </Frame>
  )
}

/* ---------- triangle toran (bunting) ---------- */

const TORAN_FLAGS = 7
const FLAG_W = 380 / TORAN_FLAGS

function Toran({ colors }: { colors: Record<string, string> }) {
  const flags = Array.from({ length: TORAN_FLAGS }, (_, i) => 10 + i * FLAG_W)
  return (
    <Frame>
      {(ids) => (
        // the bunting is wide and short — centered vertically in the square frame
        <g transform="translate(0 64)">
          <path d="M14 58 Q2 20 30 14" fill="none" stroke={CORD} strokeWidth="4" strokeLinecap="round" />
          <path d="M386 58 Q398 20 370 14" fill="none" stroke={CORD} strokeWidth="4" strokeLinecap="round" />
          {flags.map((x, i) => (
            <g key={x}>
              <Part ids={ids} color={colors.tassels} d={`M${x + FLAG_W / 2 - 3} 206 L${x + FLAG_W / 2 + 3} 206 L${x + FLAG_W / 2 + 10} 262 L${x + FLAG_W / 2 - 10} 262 Z`} />
              <Part ids={ids} color={colors.tassels} d={circle(x + FLAG_W / 2, 204, 7)} />
              <Part ids={ids} color={i % 2 === 0 ? colors.flagsA : colors.flagsB} d={`M${x + 1} 74 L${x + FLAG_W - 1} 74 L${x + FLAG_W / 2} 198 Z`} />
              {[0, 72, 144, 216, 288].map((a) => (
                <Part key={a} ids={ids} color={colors.flowers} d={circle(x + FLAG_W / 2, 104, 6.5)} transform={`rotate(${a} ${x + FLAG_W / 2} 114)`} />
              ))}
              <Part ids={ids} color={colors.flowerCenter} d={circle(x + FLAG_W / 2, 114, 5)} />
            </g>
          ))}
          <Part ids={ids} color={colors.band} d="M8 44 Q8 38 14 38 L386 38 Q392 38 392 44 L392 74 Q392 80 386 80 L14 80 Q8 80 8 74 Z" />
        </g>
      )}
    </Frame>
  )
}

/* ---------- round wall hanging (hoop mandala) ---------- */

function WallHanging({ colors }: { colors: Record<string, string> }) {
  const tassels = [130, 165, 200, 235, 270]
  return (
    <Frame>
      {(ids) => (
        <>
          <path d="M200 40 L200 10" stroke={CORD} strokeWidth="3" />
          <path d="M150 16 Q200 -4 250 16" fill="none" stroke={CORD} strokeWidth="3" />
          {tassels.map((x, i) => {
            // starts just inside the hoop's lower edge (hidden behind it) so it looks tied on
            const top = 150 + Math.round(Math.sqrt(112 * 112 - (x - 200) ** 2)) - 6
            const len = i === 2 ? 130 : i % 2 ? 110 : 90
            return (
              <g key={x}>
                <path d={`M${x} ${top} L${x} ${top + 18}`} stroke={colors.tassels} strokeWidth="3" />
                <Part ids={ids} color={colors.tassels} d={`M${x - 4} ${top + 18} L${x + 4} ${top + 18} L${x + 12} ${top + len} L${x - 12} ${top + len} Z`} />
                <Part ids={ids} color={colors.tassels} d={circle(x, top + 20, 7)} />
              </g>
            )
          })}
          <Part ids={ids} color={colors.background} d={circle(200, 150, 100)} />
          {Array.from({ length: 8 }, (_, i) => i * 45).map((a) => (
            <Part key={a} ids={ids} color={colors.petals} d={ellipse(200, 96, 18, 36)} transform={`rotate(${a} 200 150)`} />
          ))}
          <Part ids={ids} color={colors.center} d={circle(200, 150, 24)} />
          <path
            d={`${circle(200, 150, 112)} ${circle(200, 150, 98)}`}
            fill={colors.hoop}
            fillRule="evenodd"
          />
          <path d={`${circle(200, 150, 112)} ${circle(200, 150, 98)}`} fill={`url(#${ids.stitch})`} fillRule="evenodd" />
        </>
      )}
    </Frame>
  )
}

/* ---------- hair bow clip ---------- */

function HairBow({ colors }: { colors: Record<string, string> }) {
  return (
    <Frame>
      {(ids) => (
        <>
          <rect x="84" y="196" width="232" height="12" rx="6" fill={METAL} />
          <Part ids={ids} color={colors.tails} d="M190 206 L140 318 L164 310 L176 330 L206 214 Z" />
          <Part ids={ids} color={colors.tails} d="M210 206 L260 318 L236 310 L224 330 L194 214 Z" />
          <Part ids={ids} color={colors.loops} d="M200 200 C150 120 70 120 64 200 C70 280 150 280 200 200 Z" />
          <Part ids={ids} color={colors.loops} d="M200 200 C250 120 330 120 336 200 C330 280 250 280 200 200 Z" />
          <Part ids={ids} color={colors.knot} d="M180 178 Q180 170 188 170 L212 170 Q220 170 220 178 L220 222 Q220 230 212 230 L188 230 Q180 230 180 222 Z" />
        </>
      )}
    </Frame>
  )
}

/* ---------- heart keychain ---------- */

const HEART = 'M200 340 C110 280 78 230 78 186 C78 144 108 118 144 118 C172 118 190 134 200 154 C210 134 228 118 256 118 C292 118 322 144 322 186 C322 230 290 280 200 340 Z'

function KeychainHeart({ colors }: { colors: Record<string, string> }) {
  return (
    <Frame>
      {(ids) => (
        <>
          <circle cx="200" cy="58" r="28" fill="none" stroke={METAL} strokeWidth="7" />
          <path d="M200 86 L200 108" stroke={METAL} strokeWidth="5" />
          <circle cx="200" cy="116" r="9" fill="none" stroke={METAL} strokeWidth="4" />
          <path d={HEART} fill="none" stroke={colors.trim} strokeWidth="18" strokeLinejoin="round" />
          <path d={HEART} fill="none" stroke={`url(#${ids.stitch})`} strokeWidth="18" strokeLinejoin="round" />
          <Part ids={ids} color={colors.heart} d={HEART} />
          {[0, 72, 144, 216, 288].map((a) => (
            <Part key={a} ids={ids} color={colors.flower} d={circle(252, 178, 11)} transform={`rotate(${a} 252 196)`} />
          ))}
          <Part ids={ids} color={colors.flowerCenter} d={circle(252, 196, 8)} />
        </>
      )}
    </Frame>
  )
}

/* ---------- registry ---------- */

export const PREVIEW_TEMPLATES: PreviewTemplate[] = [
  {
    key: 'flower-5-petal',
    name: 'Flower (5 petals)',
    zones: [
      { key: 'petals', label: 'Petals', defaultColor: '#ffd700' },
      { key: 'center', label: 'Center', defaultColor: '#6f4e37' },
      { key: 'leaves', label: 'Leaves', defaultColor: '#7c9473' },
      { key: 'stem', label: 'Stem', defaultColor: '#5f7a52' },
    ],
    Component: Flower,
  },
  {
    key: 'toran-triangle',
    name: 'Toran (triangle bunting)',
    zones: [
      { key: 'band', label: 'Top band', defaultColor: '#800020' },
      { key: 'flagsA', label: 'Triangles (odd)', defaultColor: '#ffa500' },
      { key: 'flagsB', label: 'Triangles (even)', defaultColor: '#c41e3a' },
      { key: 'flowers', label: 'Flowers', defaultColor: '#fff5b0' },
      { key: 'flowerCenter', label: 'Flower centers', defaultColor: '#008000' },
      { key: 'tassels', label: 'Tassels', defaultColor: '#ffd700' },
    ],
    Component: Toran,
  },
  {
    key: 'wall-hanging-round',
    name: 'Wall hanging (round mandala)',
    zones: [
      { key: 'hoop', label: 'Hoop', defaultColor: '#c8b8a0' },
      { key: 'background', label: 'Background', defaultColor: '#f5f0e1' },
      { key: 'petals', label: 'Petals', defaultColor: '#b19cd9' },
      { key: 'center', label: 'Center', defaultColor: '#ff6f61' },
      { key: 'tassels', label: 'Tassels', defaultColor: '#b19cd9' },
    ],
    Component: WallHanging,
  },
  {
    key: 'hair-bow-clip',
    name: 'Hair bow clip',
    zones: [
      { key: 'loops', label: 'Bow loops', defaultColor: '#ffc0cb' },
      { key: 'knot', label: 'Center knot', defaultColor: '#ff69b4' },
      { key: 'tails', label: 'Tails', defaultColor: '#ffc0cb' },
    ],
    Component: HairBow,
  },
  {
    key: 'keychain-heart',
    name: 'Heart keychain',
    zones: [
      { key: 'heart', label: 'Heart', defaultColor: '#ff6f61' },
      { key: 'trim', label: 'Border trim', defaultColor: '#ffffff' },
      { key: 'flower', label: 'Flower', defaultColor: '#ffd700' },
      { key: 'flowerCenter', label: 'Flower center', defaultColor: '#ffffff' },
    ],
    Component: KeychainHeart,
  },
]

export const getPreviewTemplate = (key?: string) => PREVIEW_TEMPLATES.find((t) => t.key === key)
