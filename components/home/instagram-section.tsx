import Image from 'next/image'
import { Instagram } from 'lucide-react'
import { Button } from '@/components/ui/button'

const instagramPosts = [
  {
    id: 1,
    image: '/instagram/insta-1.jpg',
    alt: 'Crochet amigurumi collection',
  },
  {
    id: 2,
    image: '/instagram/insta-2.jpg',
    alt: 'Personalized keychains',
  },
  {
    id: 3,
    image: '/instagram/insta-3.jpg',
    alt: 'Home decor items',
  },
  {
    id: 4,
    image: '/instagram/insta-4.jpg',
    alt: 'Baby collection',
  },
  {
    id: 5,
    image: '/instagram/insta-5.jpg',
    alt: 'Crafting process',
  },
  {
    id: 6,
    image: '/instagram/insta-6.jpg',
    alt: 'Festive collection',
  },
]

export function InstagramSection() {
  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-mint text-sm font-medium mb-4">
            @suthrayaa
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Follow Us on Instagram
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Join our creative community and get inspired by our latest creations, 
            behind-the-scenes peeks, and customer showcases.
          </p>
          <Button asChild className="group">
            <a
              href="https://instagram.com/suthrayaa"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram className="mr-2 h-4 w-4" />
              Follow @suthrayaa
            </a>
          </Button>
        </div>

        {/* Instagram Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {instagramPosts.map((post) => (
            <a
              key={post.id}
              href="https://instagram.com/suthrayaa"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square rounded-xl overflow-hidden"
            >
              <Image
                src={post.image}
                alt={post.alt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/40 transition-colors flex items-center justify-center">
                <Instagram className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
