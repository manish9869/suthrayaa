'use client'

import { cn } from '@/lib/utils'

interface DualRangeSliderProps {
  min: number
  max: number
  step?: number
  value: [number, number]
  onValueChange: (value: [number, number]) => void
  onValueCommit?: (value: [number, number]) => void
  className?: string
}

// One visual track with two overlaid native <input type="range"> handles. Each input's own
// track is made invisible and pointer-events are disabled on the input except its thumb (via
// ::-webkit-slider-thumb / ::-moz-range-thumb), so the two thumbs are independently
// draggable while a shared bar underneath renders the visible track + selected-range fill.
//
// This exact technique was suspected as the culprit through several rounds of "still not
// working" — it turned out the real cause was the *parent* filter panel remounting on every
// drag tick (see shop-content.tsx / admin products page: `{FilterContent()}` instead of
// `<FilterContent />`), which tore down this component's DOM mid-drag regardless of which
// slider implementation it was. With that fixed, this overlay technique works correctly.
const thumbClass =
  'pointer-events-none absolute inset-x-0 top-1/2 h-2 w-full -translate-y-1/2 appearance-none bg-transparent ' +
  '[&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:bg-transparent ' +
  '[&::-moz-range-track]:bg-transparent ' +
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing ' +
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab'

export function DualRangeSlider({ min, max, step = 1, value, onValueChange, onValueCommit, className }: DualRangeSliderProps) {
  const [minVal, maxVal] = value
  const minPercent = ((minVal - min) / (max - min)) * 100
  const maxPercent = ((maxVal - min) / (max - min)) * 100
  // When the two handles are bunched together near the top of the range, the min handle
  // needs priority so it can still be pulled back down rather than being permanently
  // shadowed underneath the max handle.
  const minOnTop = minVal >= max - Math.max(step * 4, (max - min) * 0.05)

  return (
    <div className={cn('relative flex h-5 w-full items-center', className)}>
      <div className="pointer-events-none absolute inset-x-0 h-2 rounded-full bg-muted" />
      <div
        className="pointer-events-none absolute h-2 rounded-full bg-primary"
        style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={minVal}
        onChange={(e) => onValueChange([Math.min(Number(e.target.value), maxVal - step), maxVal])}
        onMouseUp={() => onValueCommit?.([minVal, maxVal])}
        onTouchEnd={() => onValueCommit?.([minVal, maxVal])}
        onKeyUp={() => onValueCommit?.([minVal, maxVal])}
        className={thumbClass}
        style={{ zIndex: minOnTop ? 40 : 30 }}
        aria-label="Minimum price"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={maxVal}
        onChange={(e) => onValueChange([minVal, Math.max(Number(e.target.value), minVal + step)])}
        onMouseUp={() => onValueCommit?.([minVal, maxVal])}
        onTouchEnd={() => onValueCommit?.([minVal, maxVal])}
        onKeyUp={() => onValueCommit?.([minVal, maxVal])}
        className={thumbClass}
        style={{ zIndex: minOnTop ? 30 : 40 }}
        aria-label="Maximum price"
      />
    </div>
  )
}
