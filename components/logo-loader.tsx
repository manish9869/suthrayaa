import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Animated Suthrayaa logo loader: the logo breathes inside a ring of running stitches while
 * a peach thread, led by a needle, is pulled around it. Pure CSS (no JS), so it paints
 * immediately in route `loading.tsx` files; honours prefers-reduced-motion (static ring).
 * Brand colours are fixed so it looks the same in the storefront and the admin console.
 */
export function LogoLoader({
  label = 'Stitching your page…',
  size = 132,
  fullScreen = false,
  className,
}: {
  label?: string | null
  size?: number
  fullScreen?: boolean
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-5', fullScreen ? 'min-h-[100svh]' : 'min-h-[60vh]', className)}
    >
      <div className="logo-loader relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          {/* soft halo */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="#6d4aff" strokeOpacity="0.08" strokeWidth="6" />
          {/* running stitches, slowly turning */}
          <g className="logo-loader__stitches">
            <circle cx="50" cy="50" r="46" fill="none" stroke="#6d4aff" strokeOpacity="0.55" strokeWidth="1.8" strokeDasharray="5 4" strokeLinecap="round" />
          </g>
          {/* the thread being pulled round, with the needle at its head */}
          <g className="logo-loader__thread">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#ff9e7a"
              strokeWidth="2.6"
              strokeLinecap="round"
              pathLength="100"
              strokeDasharray="28 72"
              transform="rotate(-90 50 50)"
            />
            <g transform="rotate(100.8 50 50)">
              <circle cx="50" cy="4" r="4.2" fill="#ff9e7a" stroke="white" strokeWidth="1.4" />
            </g>
          </g>
        </svg>
        <div className="logo-loader__mark absolute inset-[18%]">
          <Image src="/logo-mark.png" alt="" fill priority sizes={`${size}px`} className="object-contain" />
        </div>
      </div>
      {label && <p className="logo-loader__label font-serif text-[15px] italic text-[#6d4aff]">{label}</p>}
      <span className="sr-only">Loading</span>
    </div>
  )
}
