import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Play } from 'lucide-react'

export function StorySection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image Grid */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="aspect-[3/4] rounded-2xl overflow-hidden">
                  <Image
                    src="/artisan-hands.jpg"
                    alt="Crafting process"
                    width={400}
                    height={533}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="aspect-square rounded-2xl overflow-hidden bg-secondary flex items-center justify-center">
                  <div className="text-center p-4">
                    <div className="text-4xl font-serif font-bold text-secondary-foreground">500+</div>
                    <p className="text-sm text-secondary-foreground/80">Happy Customers</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="aspect-square rounded-2xl overflow-hidden bg-mint flex items-center justify-center">
                  <div className="text-center p-4">
                    <div className="text-4xl font-serif font-bold text-mint-foreground">100%</div>
                    <p className="text-sm text-mint-foreground/80">Handmade</p>
                  </div>
                </div>
                <div className="aspect-[3/4] rounded-2xl overflow-hidden relative group cursor-pointer">
                  <Image
                    src="/hero-crochet.jpg"
                    alt="Yarn and crochet"
                    width={400}
                    height={533}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="h-6 w-6 text-foreground ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-peach/50 rounded-full -z-10" />
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-lavender/50 rounded-full -z-10" />
          </div>

          {/* Content */}
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-mint text-sm font-medium mb-4">
              Our Story
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-6 text-balance">
              Every Stitch Tells a Story
            </h2>
            <div className="space-y-4 text-muted-foreground mb-8">
              <p>
                Suthrayaa was born from a passion for the timeless art of crochet. What started as a hobby 
                has blossomed into a mission to bring handcrafted joy to homes across India.
              </p>
              <p>
                The name &quot;Suthrayaa&quot; comes from the Sanskrit word for thread - representing the 
                beautiful threads that connect us all. Each creation is more than just a product; 
                it&apos;s a story woven with love, patience, and artistic vision.
              </p>
              <p>
                We believe in sustainable craftsmanship, using premium quality yarns and eco-friendly 
                materials. Every piece is made to order, ensuring it&apos;s crafted specially for you.
              </p>
            </div>

            <div className="flex flex-wrap gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl font-serif font-bold text-primary">2+</div>
                <p className="text-sm text-muted-foreground">Years of Craft</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-serif font-bold text-primary">1000+</div>
                <p className="text-sm text-muted-foreground">Pieces Created</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-serif font-bold text-primary">50+</div>
                <p className="text-sm text-muted-foreground">Unique Designs</p>
              </div>
            </div>

            <Button size="lg" asChild className="group">
              <Link href="/about">
                Read Our Full Story
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
