'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { AccountPageHeader, useAccount } from '@/components/account/account-shell'
import { Field, invalidProps } from '@/components/account/field'
import { fieldErrorsFrom, updateProfile } from '@/lib/api/account'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { isValidIndianMobile } from '@/lib/india'
import { hasErrors, validateEmail } from '@/lib/validation'
import { cn } from '@/lib/utils'

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border bg-card p-5 shadow-[0_1px_2px_rgb(49_32_140/0.04)] sm:p-7">
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

  // ---- email change (Supabase sends a confirmation link to the new address) ----
  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState<string>()
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const changeEmail = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const err = validateEmail(newEmail) ?? (newEmail.trim().toLowerCase() === email?.toLowerCase() ? 'That’s already your email' : undefined)
    setEmailError(err)
    if (err) return
    setEmailSending(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() }, { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account/profile` })
    setEmailSending(false)
    if (error) {
      setEmailError(error.message)
      return
    }
    setEmailSent(true)
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

        <Card title="Email address" description={email ? `You sign in and receive order updates at ${email}.` : undefined}>
          {emailSent ? (
            <div className="flex items-start gap-3 rounded-2xl bg-primary/[0.06] p-4 text-sm">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p>
                We’ve sent a confirmation link to <strong>{newEmail}</strong>. Your email changes once you open it{email ? ' (you may also need to confirm from your current inbox)' : ''}.
              </p>
            </div>
          ) : (
            <form onSubmit={changeEmail} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Field label="New email address" htmlFor="p-email" error={emailError} className="flex-1">
                <Input
                  id="p-email"
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value)
                    setEmailError(undefined)
                  }}
                  placeholder="you@example.com"
                  {...invalidProps('p-email', emailError)}
                  className={cn('h-11 rounded-xl bg-card', emailError && 'border-destructive')}
                />
              </Field>
              <Button type="submit" variant="outline" className="rounded-full sm:mt-[26px]" disabled={emailSending}>
                {emailSending && <Loader2 className="h-4 w-4 animate-spin" />} Change email
              </Button>
            </form>
          )}
        </Card>
      </div>
    </>
  )
}
