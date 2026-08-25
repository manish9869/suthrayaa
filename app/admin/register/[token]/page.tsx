'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lock, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { verifyInvite, acceptInvite, type InviteDetails } from '@/lib/api/rbac'
import { Spinner } from '@/components/ui/spinner'

// Deliberately not linked from anywhere in the app (sidebar, login page, etc.) — reachable
// only by the exact invite URL an existing admin generated and shared out of band. Outside
// the (dashboard) route group, so it isn't wrapped by the auth-gated admin layout: the
// person opening this link has no session yet.
export default function AdminRegisterPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [invalid, setInvalid] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    verifyInvite(params.token)
      .then(setInvite)
      .catch(() => setInvalid(true))
  }, [params.token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      await acceptInvite(params.token, password)
      toast.success('Account created — sign in to continue')
      router.push('/admin/login')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete registration')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="dark min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm shadow-soft">
        <CardContent className="p-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
          </div>

          {!invite && !invalid && (
            <div className="flex justify-center py-8">
              <Spinner className="size-6 text-primary" />
            </div>
          )}

          {invalid && (
            <div className="text-center space-y-2">
              <h1 className="text-xl font-serif font-bold">This invite is no longer valid</h1>
              <p className="text-sm text-muted-foreground">
                It may have expired or already been used. Ask whoever invited you to send a new one.
              </p>
            </div>
          )}

          {invite && (
            <>
              <h1 className="text-xl font-serif font-bold text-center mb-1">Welcome to Suthrayaa</h1>
              <p className="text-sm text-muted-foreground text-center mb-1">Set a password to activate your admin account</p>
              <p className="text-xs text-muted-foreground text-center mb-4">{invite.email}</p>
              <div className="flex justify-center gap-1 mb-6 flex-wrap">
                {invite.roleNames.map((name) => (
                  <Badge key={name} variant="secondary" className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> {name}
                  </Badge>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? 'Activating...' : 'Activate Account'}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
