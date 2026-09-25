import type { Metadata } from 'next'
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react'
import { StaticPageShell } from '@/components/static-page-shell'
import { ContactForm } from '@/components/contact-form'
import { getCategories } from '@/lib/data'
import { getStoreContact, telHref } from '@/lib/store-contact'
import { getContentBlock } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Contact Us | Suthrayaa',
  description: 'Get in touch with the Suthrayaa team — questions, custom orders, or just to say hi.',
}

export default async function ContactPage() {
  const [categories, contact, page] = await Promise.all([getCategories(), getStoreContact(), getContentBlock('page.contact')])

  const contactDetails = [
    { icon: Mail, label: 'Email', value: contact.email, href: `mailto:${contact.email}` },
    ...(contact.phone ? [{ icon: Phone, label: contact.whatsapp ? 'Phone' : 'Phone / WhatsApp', value: contact.phone, href: telHref(contact.phone) }] : []),
    ...(contact.whatsapp && contact.whatsapp !== contact.phone
      ? [{ icon: MessageCircle, label: 'WhatsApp', value: contact.whatsapp, href: `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}` }]
      : []),
    { icon: MapPin, label: page?.studioLabel || 'Studio', value: contact.address },
    { icon: Clock, label: 'Hours', value: contact.hours ?? 'Mon–Sat, 10am–6pm IST' },
  ]

  return (
    <StaticPageShell
      categories={categories}
      eyebrow={page?.eyebrow || "We'd Love to Hear From You"}
      title={page?.title || 'Get in Touch'}
      description={page?.description ?? "Questions about an order, a custom piece in mind, or just want to say hi? We're one message away."}
      wide
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 max-w-5xl mx-auto">
        <div className="lg:col-span-2 space-y-4">
          {contactDetails.map((detail) => (
            <div key={detail.label} className="flex items-start gap-3 p-4 rounded-xl bg-card shadow-soft">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <detail.icon className="h-5 w-5 text-primary" />
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
