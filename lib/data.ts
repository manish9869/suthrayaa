export interface Product {
  id: string
  name: string
  slug: string
  description: string
  shortDescription: string
  price: number
  comparePrice?: number
  images: string[]
  category: string
  categorySlug: string
  tags: string[]
  colors: string[]
  isCustomizable: boolean
  customizationOptions?: {
    allowText?: boolean
    maxTextLength?: number
    textPlaceholder?: string
  }
  stock: number
  featured: boolean
  bestseller: boolean
  newArrival: boolean
  rating: number
  reviewCount: number
  estimatedDelivery: string
  dimensions?: string
  materials: string[]
  careInstructions: string[]
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  image: string
  productCount: number
}

export interface Review {
  id: string
  productId: string
  customerName: string
  rating: number
  title: string
  content: string
  date: string
  verified: boolean
  images?: string[]
}

export interface Testimonial {
  id: string
  customerName: string
  location: string
  content: string
  rating: number
  avatar?: string
  productPurchased?: string
}

// Categories
export const categories: Category[] = [
  {
    id: 'cat-1',
    name: 'Personalized Keychains',
    slug: 'keychains',
    description: 'Custom crochet keychains with names, initials, or special messages',
    image: '/categories/keychains.jpg',
    productCount: 24,
  },
  {
    id: 'cat-2',
    name: 'Amigurumi Toys',
    slug: 'amigurumi',
    description: 'Adorable handmade stuffed animals and character toys',
    image: '/categories/toys.jpg',
    productCount: 18,
  },
  {
    id: 'cat-3',
    name: 'Home Decor',
    slug: 'home-decor',
    description: 'Beautiful crochet pieces to adorn your living spaces',
    image: '/categories/home-decor.jpg',
    productCount: 15,
  },
  {
    id: 'cat-4',
    name: 'Baby Collection',
    slug: 'baby',
    description: 'Soft, safe, and adorable items for little ones',
    image: '/categories/baby.jpg',
    productCount: 12,
  },
  {
    id: 'cat-5',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Scrunchies, bookmarks, bag charms and more',
    image: '/categories/accessories.jpg',
    productCount: 20,
  },
  {
    id: 'cat-6',
    name: 'Custom Orders',
    slug: 'custom',
    description: 'Bring your unique ideas to life with custom crochet',
    image: '/hero-crochet.jpg',
    productCount: 8,
  },
]

// Products
export const products: Product[] = [
  {
    id: 'prod-1',
    name: 'Personalized Name Keychain',
    slug: 'personalized-name-keychain',
    description: 'A beautifully handcrafted crochet keychain featuring your chosen name or word. Each letter is carefully crocheted using premium cotton yarn, making it a perfect personalized gift for loved ones. The keychain comes with a sturdy metal ring and clasp.',
    shortDescription: 'Custom crochet keychain with your name',
    price: 299,
    comparePrice: 399,
    images: [
      '/products/personalized-keychain.jpg',
      '/categories/keychains.jpg',
    ],
    category: 'Personalized Keychains',
    categorySlug: 'keychains',
    tags: ['personalized', 'gift', 'keychain', 'name'],
    colors: ['#FFB5BA', '#B5D8FF', '#B5FFD8', '#FFE5B5', '#E5B5FF', '#1a365d'],
    isCustomizable: true,
    customizationOptions: {
      allowText: true,
      maxTextLength: 10,
      textPlaceholder: 'Enter name (max 10 chars)',
    },
    stock: 50,
    featured: true,
    bestseller: true,
    newArrival: false,
    rating: 4.9,
    reviewCount: 128,
    estimatedDelivery: '5-7 business days',
    dimensions: '8cm x 3cm',
    materials: ['100% Cotton Yarn', 'Metal Keyring', 'Polyester Fiberfill'],
    careInstructions: ['Spot clean only', 'Keep away from water', 'Store in dry place'],
  },
  {
    id: 'prod-2',
    name: 'Cute Bunny Amigurumi',
    slug: 'cute-bunny-amigurumi',
    description: 'An adorable handmade bunny plush toy, perfect for children and collectors alike. This soft and cuddly amigurumi is made with hypoallergenic cotton yarn and stuffed with premium polyester fiberfill. Safety eyes are securely attached.',
    shortDescription: 'Handmade crochet bunny toy',
    price: 599,
    comparePrice: 749,
    images: [
      '/products/amigurumi-bunny.jpg',
      '/categories/toys.jpg',
    ],
    category: 'Amigurumi Toys',
    categorySlug: 'amigurumi',
    tags: ['toy', 'bunny', 'amigurumi', 'kids', 'gift'],
    colors: ['#FFB5BA', '#FFFFFF', '#B5D8FF', '#FFE5B5'],
    isCustomizable: false,
    stock: 25,
    featured: true,
    bestseller: true,
    newArrival: false,
    rating: 4.8,
    reviewCount: 89,
    estimatedDelivery: '7-10 business days',
    dimensions: '20cm x 10cm x 8cm',
    materials: ['Cotton Yarn', 'Polyester Fiberfill', 'Safety Eyes'],
    careInstructions: ['Machine wash cold', 'Tumble dry low', 'Do not bleach'],
  },
  {
    id: 'prod-3',
    name: 'Macrame Plant Hanger',
    slug: 'macrame-plant-hanger',
    description: 'Elevate your indoor garden with this stunning handwoven macrame plant hanger. Perfect for displaying your favorite potted plants, this bohemian-style hanger adds warmth and texture to any room.',
    shortDescription: 'Bohemian-style crochet plant hanger',
    price: 449,
    images: [
      '/products/macrame-plant-hanger.jpg',
      '/categories/home-decor.jpg',
    ],
    category: 'Home Decor',
    categorySlug: 'home-decor',
    tags: ['home', 'decor', 'plant', 'macrame', 'bohemian'],
    colors: ['#F5F5DC', '#FFFFFF', '#D2B48C'],
    isCustomizable: false,
    stock: 30,
    featured: true,
    bestseller: false,
    newArrival: true,
    rating: 4.7,
    reviewCount: 45,
    estimatedDelivery: '5-7 business days',
    dimensions: '100cm length',
    materials: ['Natural Cotton Rope', 'Wooden Ring'],
    careInstructions: ['Dust regularly', 'Keep away from direct sunlight', 'Spot clean if needed'],
  },
  {
    id: 'prod-4',
    name: 'Baby Booties Set',
    slug: 'baby-booties-set',
    description: 'Precious handmade baby booties crafted with the softest organic cotton yarn. These adorable booties keep tiny feet warm and cozy. Available in multiple colors, they make a perfect baby shower gift.',
    shortDescription: 'Soft crochet booties for newborns',
    price: 349,
    images: [
      '/products/baby-booties.jpg',
      '/categories/baby.jpg',
    ],
    category: 'Baby Collection',
    categorySlug: 'baby',
    tags: ['baby', 'booties', 'newborn', 'gift', 'organic'],
    colors: ['#FFB5BA', '#B5D8FF', '#FFFFFF', '#FFE5B5'],
    isCustomizable: false,
    stock: 40,
    featured: false,
    bestseller: true,
    newArrival: false,
    rating: 4.9,
    reviewCount: 156,
    estimatedDelivery: '5-7 business days',
    dimensions: '0-6 months size',
    materials: ['Organic Cotton Yarn', 'Satin Ribbon'],
    careInstructions: ['Hand wash cold', 'Lay flat to dry', 'Do not tumble dry'],
  },
  {
    id: 'prod-5',
    name: 'Diwali Diya Coasters Set',
    slug: 'diwali-diya-coasters',
    description: 'Celebrate the festival of lights with these beautiful handmade crochet coasters inspired by traditional diyas. Set of 4 coasters in festive colors, perfect for protecting your surfaces while adding a touch of celebration.',
    shortDescription: 'Festive crochet coasters set of 4',
    price: 399,
    images: [
      '/products/floral-coaster-set.jpg',
      '/categories/accessories.jpg',
    ],
    category: 'Accessories',
    categorySlug: 'seasonal',
    tags: ['diwali', 'festive', 'coasters', 'home', 'indian'],
    colors: ['#FFD700', '#FF6347', '#FF69B4', '#9370DB'],
    isCustomizable: false,
    stock: 35,
    featured: true,
    bestseller: false,
    newArrival: true,
    rating: 4.6,
    reviewCount: 32,
    estimatedDelivery: '5-7 business days',
    dimensions: '10cm diameter each',
    materials: ['Cotton Yarn', 'Felt Backing'],
    careInstructions: ['Spot clean only', 'Do not machine wash', 'Iron on low if needed'],
  },
  {
    id: 'prod-6',
    name: 'Initial Letter Keychain',
    slug: 'initial-letter-keychain',
    description: 'A charming single-letter keychain perfect for personalizing bags, keys, or gifts. Each letter is carefully crocheted with attention to detail, featuring a decorative border.',
    shortDescription: 'Single letter crochet keychain',
    price: 199,
    comparePrice: 249,
    images: [
      '/products/bag-charm.jpg',
      '/products/personalized-keychain.jpg',
    ],
    category: 'Personalized Keychains',
    categorySlug: 'keychains',
    tags: ['initial', 'letter', 'keychain', 'personalized', 'gift'],
    colors: ['#FFB5BA', '#B5D8FF', '#B5FFD8', '#FFE5B5', '#E5B5FF', '#1a365d'],
    isCustomizable: true,
    customizationOptions: {
      allowText: true,
      maxTextLength: 1,
      textPlaceholder: 'Enter single letter',
    },
    stock: 100,
    featured: false,
    bestseller: true,
    newArrival: false,
    rating: 4.8,
    reviewCount: 203,
    estimatedDelivery: '3-5 business days',
    dimensions: '5cm x 5cm',
    materials: ['100% Cotton Yarn', 'Metal Keyring'],
    careInstructions: ['Spot clean only', 'Keep away from water'],
  },
  {
    id: 'prod-7',
    name: 'Teddy Bear Amigurumi',
    slug: 'teddy-bear-amigurumi',
    description: 'A classic teddy bear reimagined in crochet. This huggable friend features embroidered features for safety and is filled with premium hypoallergenic stuffing. Perfect for all ages.',
    shortDescription: 'Classic crochet teddy bear',
    price: 699,
    images: [
      '/products/amigurumi-bunny.jpg',
      '/categories/toys.jpg',
    ],
    category: 'Amigurumi Toys',
    categorySlug: 'amigurumi',
    tags: ['teddy', 'bear', 'toy', 'classic', 'gift'],
    colors: ['#D2B48C', '#8B4513', '#F5DEB3', '#FFB5BA'],
    isCustomizable: false,
    stock: 20,
    featured: false,
    bestseller: false,
    newArrival: true,
    rating: 4.7,
    reviewCount: 67,
    estimatedDelivery: '7-10 business days',
    dimensions: '25cm x 15cm x 10cm',
    materials: ['Cotton Yarn', 'Polyester Fiberfill', 'Embroidery Thread'],
    careInstructions: ['Surface wash only', 'Air dry', 'Brush gently to restore fluffiness'],
  },
  {
    id: 'prod-8',
    name: 'Crochet Basket Set',
    slug: 'crochet-basket-set',
    description: 'Organize in style with this set of 3 nesting crochet baskets. Perfect for storing small items, cosmetics, or desk accessories. Handmade with sturdy cotton rope for durability.',
    shortDescription: 'Set of 3 nesting storage baskets',
    price: 549,
    images: [
      '/categories/home-decor.jpg',
      '/products/macrame-plant-hanger.jpg',
    ],
    category: 'Home Decor',
    categorySlug: 'home-decor',
    tags: ['basket', 'storage', 'organization', 'home', 'set'],
    colors: ['#F5F5DC', '#FFFFFF', '#D2B48C', '#A0522D'],
    isCustomizable: false,
    stock: 25,
    featured: false,
    bestseller: false,
    newArrival: false,
    rating: 4.5,
    reviewCount: 38,
    estimatedDelivery: '7-10 business days',
    dimensions: 'Small: 10cm, Medium: 15cm, Large: 20cm diameter',
    materials: ['Cotton Rope', 'Jute Accents'],
    careInstructions: ['Wipe with damp cloth', 'Air dry', 'Reshape while damp if needed'],
  },
]

// Reviews
export const reviews: Review[] = [
  {
    id: 'rev-1',
    productId: 'prod-1',
    customerName: 'Priya S.',
    rating: 5,
    title: 'Perfect gift for my sister!',
    content: 'I ordered a personalized keychain with my sister\'s name for her birthday. The quality is amazing and the colors are exactly as shown. She absolutely loved it! Will definitely order more.',
    date: '2024-01-15',
    verified: true,
  },
  {
    id: 'rev-2',
    productId: 'prod-1',
    customerName: 'Rahul M.',
    rating: 5,
    title: 'Exceeded expectations',
    content: 'The craftsmanship is incredible. You can tell so much love goes into each piece. Fast shipping and beautiful packaging too!',
    date: '2024-01-10',
    verified: true,
  },
  {
    id: 'rev-3',
    productId: 'prod-2',
    customerName: 'Ananya K.',
    rating: 5,
    title: 'My daughter loves it!',
    content: 'The bunny is absolutely adorable. It\'s soft, well-made, and the perfect size for cuddling. My 3-year-old hasn\'t put it down since she got it.',
    date: '2024-01-12',
    verified: true,
  },
  {
    id: 'rev-4',
    productId: 'prod-4',
    customerName: 'Meera P.',
    rating: 5,
    title: 'Beautiful baby gift',
    content: 'Ordered these for my friend\'s baby shower. The booties are so soft and the packaging was lovely. Everyone at the shower wanted to know where I got them!',
    date: '2024-01-08',
    verified: true,
  },
]

// Testimonials for landing page
export const testimonials: Testimonial[] = [
  {
    id: 'test-1',
    customerName: 'Sneha Sharma',
    location: 'Mumbai',
    content: 'I\'ve ordered multiple keychains from Suthrayaa and each one has been perfect. The attention to detail and quality is unmatched. These make the best personalized gifts!',
    rating: 5,
    avatar: '/testimonials/avatar-1.jpg',
    productPurchased: 'Personalized Name Keychain',
  },
  {
    id: 'test-2',
    customerName: 'Aditya Patel',
    location: 'Bangalore',
    content: 'Got an amigurumi bunny for my niece and she absolutely adores it. The quality is amazing and it\'s clear that so much care goes into each piece. Highly recommend!',
    rating: 5,
    avatar: '/testimonials/avatar-3.jpg',
    productPurchased: 'Cute Bunny Amigurumi',
  },
  {
    id: 'test-3',
    customerName: 'Kavitha Reddy',
    location: 'Hyderabad',
    content: 'The macrame plant hanger is beautiful and exactly what I was looking for. It adds such a cozy touch to my living room. Will definitely be ordering more home decor pieces!',
    rating: 5,
    avatar: '/testimonials/avatar-2.jpg',
    productPurchased: 'Macrame Plant Hanger',
  },
  {
    id: 'test-4',
    customerName: 'Deepak Kumar',
    location: 'Delhi',
    content: 'Ordered custom keychains for my entire team as Diwali gifts. Everyone loved them! The customization options and quick delivery made it a seamless experience.',
    rating: 5,
    avatar: '/testimonials/avatar-3.jpg',
    productPurchased: 'Initial Letter Keychain',
  },
]

// Helper functions
export function getProductBySlug(slug: string): Product | undefined {
  return products.find(p => p.slug === slug)
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter(p => p.categorySlug === categorySlug)
}

export function getFeaturedProducts(): Product[] {
  return products.filter(p => p.featured)
}

export function getBestsellerProducts(): Product[] {
  return products.filter(p => p.bestseller)
}

export function getNewArrivals(): Product[] {
  return products.filter(p => p.newArrival)
}

export function getProductReviews(productId: string): Review[] {
  return reviews.filter(r => r.productId === productId)
}

export function searchProducts(query: string): Product[] {
  const lowercaseQuery = query.toLowerCase()
  return products.filter(p => 
    p.name.toLowerCase().includes(lowercaseQuery) ||
    p.description.toLowerCase().includes(lowercaseQuery) ||
    p.tags.some(t => t.toLowerCase().includes(lowercaseQuery))
  )
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}
