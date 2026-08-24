import { Package, Heart, Truck, Shield } from 'lucide-react'

const badges = [
  {
    icon: Heart,
    title: 'Handmade with Love',
    description: 'Each piece crafted with care',
  },
  {
    icon: Package,
    title: 'Premium Materials',
    description: '100% cotton yarn used',
  },
  {
    icon: Truck,
    title: 'Free Shipping',
    description: 'On orders above Rs. 999',
  },
  {
    icon: Shield,
    title: 'Secure Checkout',
    description: 'Safe & trusted payments',
  },
]

export function TrustBadges() {
  return (
    <section className="py-8 bg-muted/50 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {badges.map((badge) => (
            <div key={badge.title} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                <badge.icon className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">{badge.title}</h3>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
