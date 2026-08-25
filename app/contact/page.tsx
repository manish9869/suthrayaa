import type { Metadata } from 'next'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'
import { StaticPageShell } from '@/components/static-page-shell'
import { ContactForm } from '@/components/contact-form'
import { getCategories } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Contact Us | Suthrayaa',
  description: 'Get in touch with the Suthrayaa team — questions, custom orders, or just to say hi.',
}

const contactDetails = [
  { icon: Mail, label: 'Email', value: 'hello@suthrayaa.com', href: 'mailto:hello@suthrayaa.com' },
  { icon: Phone, label: 'Phone / WhatsApp', value: '+91 98765 43210', href: 'tel:+919876543210' },
  { icon: MapPin, label: 'Studio', value: 'Mumbai, Maharashtra, India' },
  { icon: Clock, label: 'Hours', value: 'Mon–Sat, 10am–6pm IST' },
]

export default async function ContactPage() {
  const categories = await getCategories()

  return (
    <StaticPageShell
      categories={categories}
      eyebrow="We'd Love to Hear From You"
      title="Get in Touch"
      description="Questions about an order, a custom piece in mind, or just want to say hi? We're one message away."
      wide
    >
      <div className="grid lg:grid-cols-5 gap-10 max-w-5xl mx-auto">
        <div className="lg:col-span-2 space-y-4">
          {contactDetails.map((detail) => (
            <div key={detail.label} className="flex items-start gap-3 p-4 rounded-xl bg-card shadow-soft">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <detail.icon className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{detail.label}</p>
                {detail.href ? (
                  <a href={detail.href} className="font-medium text-foreground hover:text-primary transition-colors">
                    {detail.value}
                  </a>
                ) : (
                  <p className="font-medium text-foreground">{detail.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-3 bg-card rounded-2xl shadow-soft p-6 lg:p-8">
          <ContactForm />
        </div>
      </div>
    </StaticPageShell>
  )
}
