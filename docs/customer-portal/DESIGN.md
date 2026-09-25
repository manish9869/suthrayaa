# Customer portal — design system

**Direction:** "lavender & peach". The storefront is bright, warm and handmade. Violet is the single action colour, peach and coral add highlights, surfaces are soft lilac, and a deep ink-violet grounds the footer. Type pairs an editorial serif for display with a friendly geometric sans for UI. Motion is quick and tactile, never floaty.

Tokens live in `app/globals.css` (`:root`). Tailwind 4 exposes them as utilities (`bg-primary`, `text-muted-foreground`, `ring-border`, …). The admin's **Branding colours** (Site Settings → Branding) override the storefront `:root` values at runtime; the admin console is never affected.

## Colour

| Token | Value | Use |
|---|---|---|
| `--primary` / `--violet` | `#6d4aff` | The one action colour: primary buttons, links, active states, focus ring |
| `--secondary` | `#ff9e7a` (peach) | Secondary accent: badges, highlights |
| `--rose` | `#e2603f` | Coral text/badge accent, sale discs |
| `--gold` | `#f5b544` | Star ratings, small highlights |
| `--background` / `--cream` | `#fcfbff` | Page |
| `--card` | `#ffffff` | Cards and panels |
| `--muted` | `#f4f1fb` | Quiet surfaces; `--muted-foreground #6b6680` for secondary text |
| `--accent` / `--lavender` | `#efeaff` | Lilac hover wash; icon chips |
| `--blush` / `--peach` | `#ffe6dc` | Warm panels (newsletter, coupon card) |
| `--sand` | `#f3efff` | Image placeholders, tinted section bands |
| `--mint` | `#ddf5e7` / fg `#1e7a48` | Success |
| `--destructive` | `#e5484d` | Errors |
| `--ink` | `#1c1642` | Footer and deep overlays |
| `--border` / `--input` | `#e8e3f5` | Hairlines |
| `--foreground` | `#1f1a33` | Body text |

**Rules**

- **Violet is for actions only.** Use one primary button per view and don't spend violet on decoration.
- **Warm colours carry emotion, not structure.** Peach, coral and gold are for sale, coupon and rating moments.
- **Text on images needs a scrim.** Use a gradient from `ink/70` so contrast holds with admin-uploaded photos.

## Typography

| Role | Font | Notes |
|---|---|---|
| Display (`.display`) | Fraunces (`--font-serif`), weight 500, `opsz 144, SOFT 50` | Section titles, hero, prices in hero moments |
| UI / body (`font-sans`) | Plus Jakarta Sans | Everything else |
| Script (`--font-script`) | Allura | Rare flourishes only |
| Mono | Geist Mono | Coupon codes, order numbers |

- **Eyebrow** (`.eyebrow`): 0.72rem, weight 600, uppercase and tracked. It always sits above a section title.
- **Accent phrase:** every section title can italicise one phrase in violet (`<em class="italic text-primary">`). In admin-edited text this is written `*like this*`, and `AccentText` renders it; section headings add a stitched underline.
- **Sizes:** section titles `text-[2.1rem] sm:text-5xl`, page titles `text-[2.6rem] sm:text-6xl lg:text-7xl`, body `15–17px`, captions `12–13px`.

## Shape and depth

- **Radius:** base `--radius: 1rem`. Storefront cards use a generous `rounded-[1.5rem]`–`rounded-[2rem]`. Category tiles are circles, and the story image uses the `.arch` shape.
- **Shadows:** kept soft. `.shadow-soft` suits cards; the hero and trust badges use a long violet-tinted drop (`0 20px 60px -35px rgb(49 32 140 / .45)`). Prefer `ring-1 ring-border` to borders.
- **Layout:** `container mx-auto px-4`, with section padding `py-20 lg:py-28` (content) or `py-8 lg:py-12` (promo bands).

## Motion

Defined in `globals.css` and `components/motion/*`.

| Token | Curve | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(.23, 1, .32, 1)` | Entrances, hovers, interactions |
| `--ease-drawer` | `cubic-bezier(.32, .72, 0, 1)` | Sheets and drawers (cart) |
| `--ease-in-out` | `cubic-bezier(.77, 0, .175, 1)` | On-screen movement |

**Patterns**

| Pattern | What it does |
|---|---|
| `Reveal` / `Stagger` | Fade and rise on scroll, once |
| `.lift` | Card hover: −4px plus shadow, on hover devices only |
| `.zoom-img` | Slow image zoom on hover |
| `.tap-bounce` | Press feedback |
| `.animate-pop-in` | Changed counters (cart badge) |
| `.link-underline` | Draw-in underlines |
| `YarnDivider` / `StitchUnderline` | The brand's "thread" motif |

**Rules**

- **Keep durations short:** 160–320ms for UI and 600–700ms for reveals.
- **Honour reduced motion.** Everything checks `prefers-reduced-motion`: parallax, autoplay and doodles switch off, and fades remain.
- **Autoplay only when it makes sense.** Carousels and reels autoplay only while in view and pause on hover.

## Components

| Component | Where | Notes |
|---|---|---|
| `SectionHeading` | Every homepage section | Eyebrow + title (+ accent) + description + "view all" link; accepts the admin section row via `content` |
| `ProductCard` | Grids, carousels | Image, wishlist heart, price with compare-at, quick add |
| `StaticPageShell` | About, FAQs, Contact, policies | Breadcrumb + eyebrow + serif title + optional hero image |
| `LegalSection` + `Markdown` | Policy pages | Serif H2, muted body, styled lists and links |
| `NewsletterSignup` | Footer, homepage | Blush card; stores signups |
| `ReviewForm` | Product page | Star picker dialog; sends signed-out visitors to login first |
| `ContentIcon` | Badges, steps, perks | Maps admin icon names to lucide icons |
| Buttons | Everywhere | `size="lg"` with `h-12 px-7` for primary CTAs; trailing `ArrowRight` that nudges on hover |

## Content and imagery

- **Photography:** warm, styled flat-lays and in-use scenes of real pieces (`public/editorial/*.webp`). Admin uploads are re-encoded to WebP at up to 2000px.
- **Voice:** warm, personal, specific ("Hand-crocheted, stitch by stitch"). Use the rupee symbol ₹, Indian date formats and `en-IN` number formatting.
- **Accessibility:** every image the admin adds has an alt-text field; decorative images use `alt=""`. Keep contrast at least 4.5:1 for body text.

## Responsive

The layout is mobile-first. Horizontal carousels use `snap-x` with hidden scrollbars on phones and turn into grids from `sm:`/`lg:`. Tap targets are at least 44px. The header perks strip becomes a marquee below `lg`.
