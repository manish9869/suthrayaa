'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Separator } from '@/components/ui/separator'
import { Mail, Lock, Eye, EyeOff, Phone, Sparkles, User, Loader2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [redirectTo, setRedirectTo] = useState('/')
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRedirectTo(params.get('redirect') || '/')
  }, [])

  // Landing here from a "reset password" email puts Supabase into a recovery session —
  // detected via onAuthStateChange rather than a separate route, so the same page handles it.
  const [recoveryMode, setRecoveryMode] = useState(false)
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const [loginMethod, setLoginMethod] = useState<'email' | 'mobile'>('email')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [showPassword, setShowPassword] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)

  const [phase, setPhase] = useState<'start' | 'otp'>('start')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loadingGoogle, setLoadingGoogle] = useState(false)

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` },
    })
    if (error) {
      toast.error('Google sign-in isn’t configured yet. Please try again later.')
      setLoadingGoogle(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createSupabaseBrowserClient()

    if (authMode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast.error(error.message.includes('Invalid login credentials') ? 'Incorrect email or password' : error.message)
        setLoading(false)
        return
      }
      router.push(redirectTo)
      router.refresh()
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      setLoading(false)
      return
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    if (data.session) {
      toast.success('Account created — welcome!')
      router.push(redirectTo)
      router.refresh()
      return
    }
    toast.success('Check your email to confirm your account')
    setAuthMode('signin')
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Enter your email above first')
      return
    }
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`Password reset link sent to ${email}`)
  }

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setResettingPassword(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    setResettingPassword(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Password updated — you’re signed in')
    router.push(redirectTo)
    router.refresh()
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
    toast.info('Phone login is coming soon — please use email or Google sign-in for now.')
  }

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault()
    toast.info('Phone login is coming soon — please use email or Google sign-in for now.')
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
            {recoveryMode ? (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Lock className="h-5 w-5" />
                  </div>
                </div>
                <h1 className="text-2xl font-serif font-bold text-center mb-1">Set a New Password</h1>
                <p className="text-sm text-muted-foreground text-center mb-6">Choose a new password for your account.</p>
                <form onSubmit={handleSetNewPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="pl-10 pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={resettingPassword}>
                    {resettingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Update Password
                  </Button>
                </form>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                </div>
                <h1 className="text-2xl font-serif font-bold text-center mb-1">
                  {authMode === 'signin' ? 'Welcome Back' : 'Create Your Account'}
                </h1>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Sign in to track orders, save favorites, and check out faster.
                </p>

                <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as 'email' | 'mobile')}>
                  <TabsList className="grid grid-cols-2 mb-6 h-auto p-1.5 rounded-full bg-muted gap-1">
                    <TabsTrigger
                      value="email"
                      className="rounded-full py-2 gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
                    >
                      <Mail className="h-3.5 w-3.5" /> Email &amp; Password
                    </TabsTrigger>
                    <TabsTrigger
                      value="mobile"
                      className="rounded-full py-2 gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
                    >
                      <Phone className="h-3.5 w-3.5" /> Mobile Number
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="email">
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                      {authMode === 'signup' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input id="firstName" className="pl-10" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            required
                            className="pl-10"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                          {authMode === 'signin' && (
                            <button
                              type="button"
                              onClick={handleForgotPassword}
                              className="text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            className="pl-10 pr-10"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <Button type="submit" size="lg" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                      </Button>

                      <p className="text-center text-sm text-muted-foreground">
                        {authMode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                        <button
                          type="button"
                          className="font-medium text-primary hover:underline"
                          onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                        >
                          {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                        </button>
                      </p>
                    </form>
                  </TabsContent>

                  <TabsContent value="mobile">
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
                          Verify &amp; Sign In
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setPhase('start')}>
                          Use a different number
                        </Button>
                      </form>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="relative my-6">
                  <Separator />
                  <span className="absolute inset-x-0 -top-2.5 text-center text-xs text-muted-foreground bg-card px-2 mx-auto w-fit">
                    OR CONTINUE WITH
                  </span>
                </div>

                <Button variant="outline" size="lg" className="w-full" onClick={handleGoogleLogin} disabled={loadingGoogle}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  {loadingGoogle ? 'Redirecting...' : 'Continue with Google'}
                </Button>
              </>
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
