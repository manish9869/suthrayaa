'use client'

import { useId, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ImageIcon, Plus, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ContentIcon } from '@/components/content-text'
import { uploadContentImage, type ContentField } from '@/lib/api/admin'
import { cn } from '@/lib/utils'

type Value = Record<string, unknown>

/** Schema-driven form for a Storefront Content block — the fields come from the backend catalog,
 * so a new block or field needs no admin UI work. Lists support add/remove/reorder and nest. */
export function ContentFieldsForm({
  fields,
  value,
  onChange,
  icons,
  disabled,
}: {
  fields: ContentField[]
  value: Value
  onChange: (next: Value) => void
  icons: string[]
  disabled?: boolean
}) {
  const set = (name: string, v: unknown) => onChange({ ...value, [name]: v })
  return (
    <div className="space-y-5">
      {fields.map((f) => (
        <FieldEditor key={f.name} field={f} value={value[f.name]} onChange={(v) => set(f.name, v)} icons={icons} disabled={disabled} />
      ))}
    </div>
  )
}

function FieldEditor({
  field,
  value,
  onChange,
  icons,
  disabled,
}: {
  field: ContentField
  value: unknown
  onChange: (v: unknown) => void
  icons: string[]
  disabled?: boolean
}) {
  const str = typeof value === 'string' ? value : ''
  const id = useId()

  let control: React.ReactNode
  switch (field.type) {
    case 'textarea':
      control = <Textarea id={id} rows={3} value={str} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      break
    case 'markdown':
      control = (
        <>
          <Textarea id={id} rows={6} value={str} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="font-mono text-[13px]" />
          <p className="text-xs text-muted-foreground">
            Blank line = new paragraph · <code>- </code> starts a bullet · <code>**bold**</code> · <code>[label](/link)</code> · <code>{'{{email}}'}</code> = store email
          </p>
        </>
      )
      break
    case 'image':
      control = <ImageField value={str} onChange={onChange} disabled={disabled} />
      break
    case 'video':
      control = <Input id={id} value={str} disabled={disabled} placeholder="https://…/clip.mp4" onChange={(e) => onChange(e.target.value)} />
      break
    case 'icon':
      control = (
        <Select value={str || undefined} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose an icon" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {icons.map((name) => (
              <SelectItem key={name} value={name}>
                <span className="flex items-center gap-2">
                  <ContentIcon name={name} className="h-4 w-4" /> {name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
      break
    case 'list':
      return <ListField field={field} value={Array.isArray(value) ? (value as Value[]) : []} onChange={onChange} icons={icons} disabled={disabled} />
    default:
      control = (
        <Input
          id={id}
          value={str}
          disabled={disabled}
          placeholder={field.type === 'url' ? '/shop or https://…' : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{field.label}</Label>
      {control}
      {field.help && field.type !== 'markdown' && <p className="text-xs text-muted-foreground">{field.help}</p>}
    </div>
  )
}

function ImageField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadContentImage(file)
      onChange(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex items-start gap-3">
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border bg-muted">
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => onChange('')}
                className="absolute right-1 top-1 rounded-full bg-black/55 p-0.5 text-white hover:bg-black/70"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Input value={value} disabled={disabled} placeholder="https://… or upload" onChange={(e) => onChange(e.target.value)} />
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} />
        <Button type="button" size="sm" variant="outline" className="w-fit" disabled={disabled || uploading} onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload image'}
        </Button>
      </div>
    </div>
  )
}

function itemTitle(field: ContentField, item: Value, index: number) {
  const firstText = (field.fields ?? []).find((f) => ['text', 'textarea'].includes(f.type) && typeof item[f.name] === 'string' && (item[f.name] as string).trim())
  const text = firstText ? (item[firstText.name] as string) : ''
  return text ? text.slice(0, 70) : `${field.itemLabel ?? 'Item'} ${index + 1}`
}

function emptyItem(field: ContentField): Value {
  return Object.fromEntries((field.fields ?? []).map((f) => [f.name, f.type === 'list' ? [] : '']))
}

function ListField({
  field,
  value,
  onChange,
  icons,
  disabled,
}: {
  field: ContentField
  value: Value[]
  onChange: (v: Value[]) => void
  icons: string[]
  disabled?: boolean
}) {
  const [open, setOpen] = useState<number | null>(value.length === 1 ? 0 : null)
  const max = field.max ?? 50

  const move = (i: number, d: -1 | 1) => {
    const next = [...value]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
    setOpen((o) => (o === i ? i + d : o === i + d ? i : o))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{field.label}</Label>
        <span className="text-xs text-muted-foreground">
          {value.length} / {max}
        </span>
      </div>
      {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="rounded-lg border bg-card">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left text-sm font-medium hover:bg-accent"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open === i && 'rotate-180')} />
                {typeof item.icon === 'string' && item.icon && <ContentIcon name={item.icon} className="h-4 w-4 shrink-0 text-primary" />}
                <span className="truncate">{itemTitle(field, item, i)}</span>
              </button>
              {!disabled && (
                <>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    aria-label="Remove"
                    onClick={() => {
                      onChange(value.filter((_, idx) => idx !== i))
                      setOpen(null)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
            {open === i && (
              <div className="border-t p-4">
                <ContentFieldsForm
                  fields={field.fields ?? []}
                  value={item}
                  icons={icons}
                  disabled={disabled}
                  onChange={(next) => onChange(value.map((it, idx) => (idx === i ? next : it)))}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {!disabled && value.length < max && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onChange([...value, emptyItem(field)])
            setOpen(value.length)
          }}
        >
          <Plus className="h-4 w-4" /> Add {(field.itemLabel ?? 'item').toLowerCase()}
        </Button>
      )}
    </div>
  )
}
