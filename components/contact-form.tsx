'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Check, Send } from 'lucide-react'
import { toast } from 'sonner'
import { sendContactMessage } from '@/lib/api/contact'

export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email) || !form.message.trim()) {
      toast.error('Please fill in your name, a valid email, and a message')
      return
    }
    setSending(true)
    try {
      await sendContactMessage(form)
      setSent(true)
      toast.success("Message sent — check your email for a confirmation!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send your message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-mint/20 p-8 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-mint flex items-center justify-center mx-auto mb-3 animate-pop-in">
          <Check className="h-6 w-6 text-mint-foreground" />
        </div>
        <h3 className="font-serif font-bold text-lg mb-1">Thanks for reaching out!</h3>
        <p className="text-sm text-muted-foreground">
          We&apos;ve emailed you a confirmation and usually reply within 1–2 business days. In the meantime, feel
          free to browse our <a href="/faqs" className="text-primary underline underline-offset-2">FAQs</a>.
        </p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Your Name</Label>
          <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Jane Doe" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@email.com" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" value={form.subject} onChange={handleChange} placeholder="Order question, custom request, etc." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" value={form.message} onChange={handleChange} rows={5} placeholder="Tell us how we can help..." />
      </div>
      <AnimatePresence>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-block">
          <Button type="submit" size="lg" disabled={sending}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </motion.div>
      </AnimatePresence>
    </form>
  )
}
