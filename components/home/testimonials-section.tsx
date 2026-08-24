'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { testimonials } from '@/lib/data'

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-lavender text-sm font-medium mb-4">
            Love From Our Customers
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real stories from real people who have experienced the magic of handcrafted crochet.
          </p>
        </div>

        {/* Testimonials Carousel */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Quote Icon */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                <Quote className="h-5 w-5 text-secondary-foreground" />
              </div>
            </div>

            <Card className="pt-8 shadow-soft">
              <CardContent className="p-8 md:p-12 text-center">
                {/* Rating */}
                <div className="flex items-center justify-center gap-1 mb-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-5 w-5',
                        i < testimonials[currentIndex].rating
                          ? 'fill-secondary text-secondary'
                          : 'text-muted'
                      )}
                    />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-lg md:text-xl text-foreground mb-8 leading-relaxed">
                  &quot;{testimonials[currentIndex].content}&quot;
                </blockquote>

                {/* Customer Info */}
                <div className="flex flex-col items-center">
                  <Avatar className="h-14 w-14 mb-3 bg-peach">
                    {testimonials[currentIndex].avatar && (
                      <AvatarImage src={testimonials[currentIndex].avatar} alt={testimonials[currentIndex].customerName} />
                    )}
                    <AvatarFallback className="text-lg font-medium">
                      {testimonials[currentIndex].customerName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="font-semibold text-foreground">
                    {testimonials[currentIndex].customerName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonials[currentIndex].location}
                  </div>
                  {testimonials[currentIndex].productPurchased && (
                    <div className="text-sm text-secondary mt-1">
                      Purchased: {testimonials[currentIndex].productPurchased}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={prev}
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              {/* Dots */}
              <div className="flex items-center gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      'h-2 rounded-full transition-all duration-300',
                      index === currentIndex
                        ? 'w-6 bg-secondary'
                        : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    )}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={next}
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
