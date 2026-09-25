'use client'

import { useState } from 'react'
import { Check, Eye, EyeOff, KeyRound, Loader2, LogOut, ShieldCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AccountPageHeader, useAccount } from '@/components/account/account-shell'
import { Field } from '@/components/account/field'
import { useAuth } from '@/lib/hooks/use-auth'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { isStrongPassword, passwordChecks, passwordStrength } from '@/lib/validation'
import { cn } from '@/lib/utils'

const STRENGTH = [
  { label: 'Too weak', color: 'bg-red-500' },
  { label: 'Weak', color: 'bg-red-500' },
  { label: 'Fair', color: 'bg-amber-500' },
  { label: 'Good', color: 'bg-emerald-500' },
  { label: 'Strong', color: 'bg-emerald-600' },
]

function PasswordInput({ id, value, onChange, error, autoComplete, placeholder }: { id: string; value: string; onChange: (v: string) => void; error?: string; autoComplete: string; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn('h-11 rounded-xl bg-card pr-11', error && 'border-destructive')}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export default function SecurityPage() {
  const { user } = useAuth()
  const { email } = useAccount()
  // Accounts created with Google / a mobile OTP have no password yet — they can set one.
  const providers: string[] = (user?.app_metadata?.providers as string[] | undefined) ?? (user?.app_metadata?.provider ? [user.app_metadata.provider as string] : [])
  const hasPassword = providers.includes('email')

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const checks = passwordChecks(next)
  const strength = passwordStrength(next)

  const validate = (c = current, n = next, cf = confirm) => {
    const e: Record<string, string> = {}
    if (hasPassword && !c) e.current = 'Enter your current password'
    if (!n) e.next = 'Enter a new password'
    else if (!isStrongPassword(n)) e.next = 'Use at least 8 characters with a letter and a number'
    else if (hasPassword && c && n === c) e.next = 'Your new password must be different from the current one'
    if (!cf) e.confirm = 'Re-enter your new password'
    else if (n && cf !== n) e.confirm = 'Passwords don’t match'
    return e
  }
  const update = (field: 'current' | 'next' | 'confirm', v: string) => {
    const vals = { current, next, confirm, [field]: v }
    if (field === 'current') setCurrent(v)
    if (field === 'next') setNext(v)
    if (field === 'confirm') setConfirm(v)
    if (submitted) setErrors(validate(vals.current, vals.next, vals.confirm))
  }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setSubmitted(true)
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    const supabase = createSupabaseBrowserClient()
    try {
      if (hasPassword) {
        if (!email) throw new Error('Your account has no email address to verify against')
        // Re-authenticate with the current password before allowing the change
        const { error } = await supabase.auth.signInWithPassword({ email, password: current })
        if (error) {
          setErrors({ current: 'That password isn’t correct' })
          return
        }
      }
      const { error } = await supabase.auth.updateUser({ password: next })
      if (error) {
        setErrors({ next: /different/i.test(error.message) ? 'Your new password must be different from the current one' : error.message })
        return
      }
      toast.success(hasPassword ? 'Password changed' : 'Password set — you can now sign in with your email')
      setCurrent('')
      setNext('')
      setConfirm('')
      setSubmitted(false)
      setErrors({})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change your password')
    } finally {
      setSaving(false)
    }
  }

  const sendReset = async () => {
    if (!email) return
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` })
    if (error) toast.error(error.message)
    else setResetSent(true)
  }

  const signOutOthers = async () => {
    setSigningOut(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signOut({ scope: 'others' })
    setSigningOut(false)
    if (error) toast.error(error.message)
    else toast.success('Signed out of all other devices')
  }

  return (
    <>
      <AccountPageHeader title="Password & security" description="Keep your account safe." />
      <div className="space-y-5">
        <section className="rounded-3xl border bg-card p-5 shadow-[0_1px_2px_rgb(49_32_140/0.04)] sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-[17px] font-semibold">{hasPassword ? 'Change password' : 'Set a password'}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {hasPassword ? 'You’ll need your current password to set a new one.' : 'You signed in with Google or your mobile — add a password to also sign in with your email.'}
              </p>
            </div>
          </div>

          <form onSubmit={submit} noValidate className="mt-6 max-w-md space-y-4">
            {hasPassword && (
              <Field label="Current password" htmlFor="pw-current" error={errors.current}>
                <PasswordInput id="pw-current" value={current} onChange={(v) => update('current', v)} error={errors.current} autoComplete="current-password" />
              </Field>
            )}
            <Field label="New password" htmlFor="pw-next" error={errors.next}>
              <PasswordInput id="pw-next" value={next} onChange={(v) => update('next', v)} error={errors.next} autoComplete="new-password" />
            </Field>
            {next && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden>
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={cn('h-1.5 rounded-full transition-colors', strength >= i ? STRENGTH[strength].color : 'bg-muted')} />
                    ))}
                  </div>
                  <span className="w-16 text-right text-xs font-medium text-muted-foreground">{STRENGTH[strength].label}</span>
                </div>
                <ul className="grid gap-1 text-[13px]">
                  {checks.map((c) => (
                    <li key={c.label} className={cn('flex items-center gap-2', c.ok ? 'text-emerald-700' : 'text-muted-foreground')}>
                      {c.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} {c.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Field label="Confirm new password" htmlFor="pw-confirm" error={errors.confirm}>
              <PasswordInput id="pw-confirm" value={confirm} onChange={(v) => update('confirm', v)} error={errors.confirm} autoComplete="new-password" />
            </Field>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button type="submit" className="rounded-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} {hasPassword ? 'Update password' : 'Set password'}
              </Button>
              {hasPassword && email && (
                resetSent ? (
                  <span className="text-sm text-muted-foreground">Reset link sent to {email}</span>
                ) : (
                  <button type="button" onClick={sendReset} className="text-sm font-medium text-primary hover:underline">
                    Forgot your current password?
                  </button>
                )
              )}
            </div>
          </form>
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-[0_1px_2px_rgb(49_32_140/0.04)] sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-[17px] font-semibold">Signed-in devices</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">Lost a phone or used a shared computer? Sign out everywhere else.</p>
            </div>
          </div>
          <Button variant="outline" className="shrink-0 rounded-full" onClick={signOutOthers} disabled={signingOut}>
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out other devices
          </Button>
        </section>
      </div>
    </>
  )
}
