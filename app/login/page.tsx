'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Separator } from '@/components/ui/separator'
import { Phone, Sparkles } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function LoginPage() {
  const [phase, setPhase] = useState<'start' | 'otp'>('start')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loadingGoogle, setLoadingGoogle] = useState(false)

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      toast.error('Google sign-in isn’t configured yet. Please try again later.')
      setLoadingGoogle(false)
    }
    // On success the browser is redirected to Google, so no further local state change needed.
  }

  // Phone OTP is a placeholder — no SMS provider has been set up yet (see backend
  // src/modules/webhooks/msg91-send-sms.hook.ts). The UI is fully built so it's ready to
  // go live the moment a provider is wired up; for now it just tells the user that.
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{10}$/.test(phone)) {
      toast.error('Enter a valid 10-digit phone number')
      return
    }
    toast.info('Phone login is coming soon — please use Google sign-in for now.')
  }

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault()
    toast.info('Phone login is coming soon — please use Google sign-in for now.')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-8">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Suthraya%20Logo%20-%20Trans-HgT4V8esTeOZ2PwWy5B7QcPjLLrahf.png"
            alt="Suthrayaa"
            width={140}
            height={70}
            className="h-14 w-auto"
            priority
          />
        </Link>

        <Card className="shadow-soft">
          <CardContent className="p-8">
            <h1 className="text-2xl font-serif font-bold text-center mb-1">Welcome Back</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Sign in to track orders, save favorites, and check out faster.
            </p>

            <Button
              variant="outline"
              size="lg"
              className="w-full mb-4"
              onClick={handleGoogleLogin}
              disabled={loadingGoogle}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {loadingGoogle ? 'Redirecting...' : 'Continue with Google'}
            </Button>

            <div className="relative my-6">
              <Separator />
              <span className="absolute inset-x-0 -top-2.5 text-center text-xs text-muted-foreground bg-card px-2 mx-auto w-fit">
                OR
              </span>
            </div>

            {phase === 'start' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="98765 43210"
                      className="pl-10"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Phone login is launching soon
                  </p>
                </div>
                <Button type="submit" variant="secondary" size="lg" className="w-full">
                  Send OTP
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2 flex flex-col items-center">
                  <Label>Enter the 6-digit code sent to {phone}</Label>
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" size="lg" className="w-full">
                  Verify & Sign In
                </Button>
                <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setPhase('start')}>
                  Use a different number
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By continuing, you agree to Suthrayaa&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  )
}
