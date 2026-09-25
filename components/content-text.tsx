import { Fragment, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Award,
  BadgeCheck,
  Clock,
  CreditCard,
  Flower2,
  Gem,
  Gift,
  HandHeart,
  Headphones,
  Heart,
  Home,
  Leaf,
  Mail,
  MapPin,
  Package,
  PackageCheck,
  Palette,
  Phone,
  Recycle,
  RotateCcw,
  Scissors,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  Sun,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'

// Renderers for admin-edited storefront copy (see lib/content.ts).

const ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  'rotate-ccw': RotateCcw,
  'shield-check': ShieldCheck,
  gem: Gem,
  award: Award,
  headphones: Headphones,
  heart: Heart,
  leaf: Leaf,
  sparkles: Sparkles,
  users: Users,
  gift: Gift,
  star: Star,
  package: Package,
  'package-check': PackageCheck,
  clock: Clock,
  'map-pin': MapPin,
  phone: Phone,
  mail: Mail,
  'credit-card': CreditCard,
  smile: Smile,
  scissors: Scissors,
  palette: Palette,
  flower: Flower2,
  home: Home,
  sun: Sun,
  'badge-check': BadgeCheck,
  'hand-heart': HandHeart,
  recycle: Recycle,
}

export function ContentIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Sparkles
  return <Icon className={className} />
}

/**
 * Renders a heading where *asterisk-wrapped* words get the italic accent treatment, e.g.
 * "Every stitch *tells a story*". `renderAccent` lets a caller decorate the accent (the section
 * headings add a stitched underline).
 */
export function AccentText({
  text,
  accentClassName = 'font-normal italic text-primary',
  renderAccent,
}: {
  text: string
  accentClassName?: string
  renderAccent?: (accent: string, key: number) => ReactNode
}) {
  const parts = text.split(/\*([^*]+)\*/g)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          renderAccent ? (
            renderAccent(part, i)
          ) : (
            <em key={i} className={accentClassName}>
              {part}
            </em>
          )
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  )
}

/** Inline markdown-lite: **bold**, *italic*, [label](href), {{email}}. */
function inline(text: string, vars: Record<string, string>): ReactNode[] {
  const withVars = text.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? `\u0000${k}\u0000` : m))
  const tokens = withVars.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|\u0000\w+\u0000)/g)
  return tokens.map((t, i) => {
    if (!t) return null
    if (t.startsWith('**') && t.endsWith('**')) return <strong key={i}>{t.slice(2, -2)}</strong>
    if (t.startsWith('*') && t.endsWith('*') && t.length > 2) return <em key={i}>{t.slice(1, -1)}</em>
    const link = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      const [, label, href] = link
      return href.startsWith('/') ? (
        <Link key={i} href={href}>
          {label}
        </Link>
      ) : (
        <a key={i} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
          {label}
        </a>
      )
    }
    const v = t.match(/^\u0000(\w+)\u0000$/)
    if (v) {
      const value = vars[v[1]]
      return v[1] === 'email' ? (
        <a key={i} href={`mailto:${value}`}>
          {value}
        </a>
      ) : (
        <Fragment key={i}>{value}</Fragment>
      )
    }
    return <Fragment key={i}>{t}</Fragment>
  })
}

/**
 * Block markdown-lite used by policy pages and FAQ answers: blank line = new paragraph,
 * lines starting "- " = bullet list. Output is plain React elements (no HTML injection).
 */
export function Markdown({ text, vars = {} }: { text: string; vars?: Record<string, string> }) {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        if (lines.every((l) => l.trim().startsWith('- '))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.trim().slice(2), vars)}</li>
              ))}
            </ul>
          )
        }
        return <p key={i}>{inline(lines.join(' '), vars)}</p>
      })}
    </>
  )
}
