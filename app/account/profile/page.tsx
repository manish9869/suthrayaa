'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Lock, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { AccountPageHeader, useAccount } from '@/components/account/account-shell'
import { Field, invalidProps } from '@/components/account/field'
import { fieldErrorsFrom, updateProfile } from '@/lib/api/account'
import { isValidIndianMobile } from '@/lib/india'
import { hasErrors } from '@/lib/validation'
import { cn } from '@/lib/utils'

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border bg-card p-5 shadow-[0_1px_2px_color-mix(in_oklab,var(--shadow-tint)_4%,transparent)] sm:p-7">
      <h3 className="text-[17px] font-semibold">{title}</h3>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default function ProfilePage() {
  const { profile, email, setProfile } = useAccount()
  const initial = useMemo(
    () => ({ firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '', phone: profile?.phone ?? '', marketingOptIn: profile?.marketingOptIn ?? false }),
    [profile]
  )
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  useEffect(() => setForm(initial), [initial])
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)

  const validate = (f = form) => {
    const e: Record<string, string> = {}
    if (!f.firstName.trim()) e.firstName = 'First name is required'
    if (!f.lastName.trim()) e.lastName = 'Last name is required'
    if (f.phone.trim() && !isValidIndianMobile(f.phone)) e.phone = 'Enter a valid 10-digit Indian mobile number'
    return e
  }

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (hasErrors(e)) return
    setSaving(true)
    try {
      const updated = await updateProfile({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.trim(), marketingOptIn: form.marketingOptIn })
      setProfile(updated)
      toast.success('Profile saved')
    } catch (err) {
      const fe = fieldErrorsFrom(err)
      setErrors(fe)
      toast.error(Object.keys(fe).length ? 'Please check the highlighted fields' : err instanceof Error ? err.message : 'Could not save your profile')
    } finally {
      setSaving(false)
    }
  }

  const input = (k: 'firstName' | 'lastName' | 'phone', props: React.ComponentProps<typeof Input> = {}) => {
    const inv = invalidProps(`p-${k}`, errors[k])
    return (
      <Input
        id={`p-${k}`}
        value={form[k]}
        onChange={(e) => {
          const next = { ...form, [k]: e.target.value }
          setForm(next)
          if (errors[k]) setErrors(validate(next))
        }}
        {...props}
        {...inv}
        className={cn('h-11 rounded-xl bg-card', inv.className, props.className)}
      />
    )
  }

  return (
    <>
      <AccountPageHeader title="Profile" description="Your personal details and communication preferences." />
      <div className="space-y-5">
        <Card title="Personal information">
          <form onSubmit={save} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First name" htmlFor="p-firstName" error={errors.firstName}>
                {input('firstName', { autoComplete: 'given-name' })}
              </Field>
              <Field label="Last name" htmlFor="p-lastName" error={errors.lastName}>
                {input('lastName', { autoComplete: 'family-name' })}
              </Field>
            </div>
            <Field label="Mobile number" htmlFor="p-phone" error={errors.phone} optional hint="Used to contact you about your orders">
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+91</span>
                {input('phone', { type: 'tel', inputMode: 'numeric', autoComplete: 'tel-national', placeholder: '98765 43210', className: 'pl-12', maxLength: 14 })}
              </div>
            </Field>
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-muted/50 p-4">
              <span>
                <span className="block text-sm font-medium">Emails about new collections</span>
                <span className="mt-0.5 block text-[13px] text-muted-foreground">Occasional notes on new pieces and offers. Order emails are always sent.</span>
              </span>
              <Switch checked={form.marketingOptIn} onCheckedChange={(v) => setForm({ ...form, marketingOptIn: v })} className="mt-0.5" />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              {dirty && (
                <Button type="button" variant="ghost" className="rounded-full" onClick={() => { setForm(initial); setErrors({}) }} disabled={saving}>
                  Discard
                </Button>
              )}
              <Button type="submit" className="rounded-full" disabled={saving || !dirty}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Email address" description="You sign in and receive order updates here. For security, your email can’t be changed.">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="p-email" type="email" value={email ?? ''} readOnly disabled aria-label="Email address" className="h-11 rounded-xl bg-muted/50 pl-10" />
            <Lock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </Card>
      </div>
    </>
  )
}
