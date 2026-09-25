'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  Banknote,
  Check,
  ChevronDown,
  ChevronRight,
  Gift,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  Wallet,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Field, invalidProps } from '@/components/account/field'
import { AddressForm, EMPTY_ADDRESS, type AddressDraft } from '@/components/account/address-form'
import { AddressLines, AddressTypeTag } from '@/components/account/address-card'
import { useCartStore } from '@/lib/store'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import { useAuth } from '@/lib/hooks/use-auth'
import { formatPrice, type Category } from '@/lib/data'
import {
  checkCart,
  getCheckoutOptions,
  placeOrder,
  toCartItemInputs,
  validateCart,
  verifyPayment,
  type CartLineIssue,
  type CheckoutOptions,
  type PricedCart,
} from '@/lib/api/checkout'
import { createAddress, getAddresses, getProfile, type SavedAddress } from '@/lib/api/account'
import { openRazorpayPayment } from '@/lib/razorpay'
import { hasErrors, validateAddress, validateEmail, type FieldErrors } from '@/lib/validation'
import { cn } from '@/lib/utils'
import { CheckoutFinishing } from '@/components/checkout-finishing'

type Step = 'address' | 'delivery' | 'payment'
const STEPS: { id: Step; label: string }[] = [
  { id: 'address', label: 'Address' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'payment', label: 'Payment' },
]

const fromSaved = (a: SavedAddress): AddressDraft => ({
  ...EMPTY_ADDRESS,
  firstName: a.firstName,
  lastName: a.lastName,
  phone: a.phone,
  addressLine1: a.addressLine1,
  addressLine2: a.addressLine2 ?? '',
  landmark: a.landmark ?? '',
  city: a.city,
  state: a.state,
  pincode: a.pincode,
  addressType: a.addressType ?? 'home',
})

const toApiAddress = (a: AddressDraft) => ({
  firstName: a.firstName.trim(),
  lastName: a.lastName.trim(),
  phone: a.phone.trim(),
  addressLine1: a.addressLine1.trim(),
  addressLine2: a.addressLine2.trim() || undefined,
  landmark: a.landmark.trim() || undefined,
  city: a.city.trim(),
  state: a.state,
  pincode: a.pincode.trim(),
})

function StepCard({
  index,
  title,
  state,
  summary,
  onEdit,
  children,
}: {
  index: number
  title: string
  state: 'active' | 'done' | 'upcoming'
  summary?: React.ReactNode
  onEdit?: () => void
  children?: React.ReactNode
}) {
  return (
    <motion.section
      layout
      transition={{ layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
      className={cn('overflow-hidden rounded-3xl border bg-card transition-shadow', state === 'active' && 'shadow-[0_18px_50px_-30px_rgb(49_32_140/0.45)] ring-1 ring-primary/15')}
    >
      <header className="flex items-center gap-3 px-5 py-4 sm:px-6">
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold',
            state === 'done' ? 'bg-primary text-primary-foreground' : state === 'active' ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'bg-muted text-muted-foreground'
          )}
        >
          {state === 'done' ? <Check className="h-4 w-4" /> : index}
        </span>
        <h2 className={cn('flex-1 text-[17px] font-semibold', state === 'upcoming' && 'text-muted-foreground')}>{title}</h2>
        {state === 'done' && onEdit && (
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            <Pencil className="h-3.5 w-3.5" /> Change
          </button>
        )}
      </header>
      <AnimatePresence initial={false} mode="popLayout">
        {state === 'done' && summary && (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="border-t px-5 py-4 text-sm sm:px-6">
            {summary}
          </motion.div>
        )}
        {state === 'active' && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t px-5 py-5 sm:px-6 sm:py-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

/**
 * Step progress as a strand of yarn: a dashed track with a violet thread that draws itself
 * to the current step, led by a little yarn ball.
 */
function CheckoutProgress({ index, done }: { index: number; done: (i: number) => boolean }) {
  const reduce = useReducedMotion()
  const pct = (index / (STEPS.length - 1)) * 100
  return (
    <div className="relative w-full max-w-md">
      <div className="absolute left-3 right-3 top-3 h-0 border-t-2 border-dashed border-primary/20" />
      <motion.div
        className="absolute left-3 top-[11px] h-[3px] rounded-full bg-gradient-to-r from-primary to-violet"
        initial={false}
        animate={{ width: `calc((100% - 1.5rem) * ${pct / 100})` }}
        transition={{ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      <ol className="relative flex justify-between">
        {STEPS.map((st, i) => {
          const active = i === index
          const complete = done(i) && !active
          return (
            <li key={st.id} className="flex flex-col items-center gap-1.5">
              <motion.span
                initial={false}
                animate={{ scale: active ? 1.12 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className={cn(
                  'relative flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-background',
                  complete || active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {complete ? <Check className="h-3.5 w-3.5" /> : i + 1}
                {active && !reduce && <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />}
              </motion.span>
              <span className={cn('text-xs font-semibold sm:text-sm', active ? 'text-foreground' : 'text-muted-foreground')}>{st.label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** Selectable saved-address card. */
function AddressOption({ a, selected, onSelect, name }: { a: SavedAddress; selected: boolean; onSelect: () => void; name: string }) {
  return (
    <label
      className={cn(
        'relative flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors',
        selected ? 'border-primary bg-primary/[0.04] ring-1 ring-primary/25' : 'hover:border-primary/40'
      )}
    >
      <input type="radio" name={name} checked={selected} onChange={onSelect} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
      <AnimatePresence>
        {selected && (
          <motion.span
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
            className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Check className="h-3.5 w-3.5" />
          </motion.span>
        )}
      </AnimatePresence>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          <AddressTypeTag a={a} />
          {a.isDefault && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Default</span>}
        </div>
        <AddressLines a={a} compact />
      </div>
    </label>
  )
}

export function CheckoutContent({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hydrated = useHydrated()
  const { user, loading: authLoading } = useAuth()
  const { items, getTotalPrice, getItemUnitPrice, clearCart, getItemKey } = useCartStore()

  const [step, setStep] = useState<Step>('address')
  const [completed, setCompleted] = useState<Set<Step>>(new Set())

  // ---- contact + addresses ----
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string>()
  const [saved, setSaved] = useState<SavedAddress[] | null>(null)
  const [shipChoice, setShipChoice] = useState<string>('new') // saved address id or 'new'
  const [shipDraft, setShipDraft] = useState<AddressDraft>(EMPTY_ADDRESS)
  const [shipErrors, setShipErrors] = useState<FieldErrors<keyof AddressDraft>>({})
  const [saveToBook, setSaveToBook] = useState(true)
  const [billingSame, setBillingSame] = useState(true)
  const [billChoice, setBillChoice] = useState<string>('new')
  const [billDraft, setBillDraft] = useState<AddressDraft>(EMPTY_ADDRESS)
  const [billErrors, setBillErrors] = useState<FieldErrors<keyof AddressDraft>>({})
  const [addressTouched, setAddressTouched] = useState(false)

  // ---- delivery + payment ----
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard')
  const [giftWrap, setGiftWrap] = useState(false)
  const [giftMessage, setGiftMessage] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay' | null>(null)
  const [paymentError, setPaymentError] = useState<string>()
  const [options, setOptions] = useState<CheckoutOptions | null>(null)

  // ---- coupon ----
  const [couponInput, setCouponInput] = useState(searchParams.get('coupon') ?? '')
  const [couponCode, setCouponCode] = useState<string | undefined>(searchParams.get('coupon') ?? undefined)
  const [couponError, setCouponError] = useState<string>()

  // ---- server pricing + cart checks ----
  const [priced, setPriced] = useState<PricedCart | null>(null)
  const [pricing, setPricing] = useState(false)
  const [pricingError, setPricingError] = useState<string>()
  const [issues, setIssues] = useState<CartLineIssue[]>([])
  const [checkingCart, setCheckingCart] = useState(true)
  const [placing, setPlacing] = useState(false)
  // One key per checkout attempt: a double click or a retried request returns the same order
  const idempotencyKey = useRef(typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined)
  // Set once the order is placed: the page switches to a "confirming" screen *before* the
  // cart is cleared, so the customer never sees an empty cart on the way to the thank-you page.
  const [finishing, setFinishing] = useState<null | 'placing' | 'paid' | 'pending'>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)

  const cartInputs = useMemo(() => toCartItemInputs(items), [items])
  const cartKey = JSON.stringify(cartInputs)

  // Prefill from the account: email, default shipping + billing addresses
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setSaved([])
      return
    }
    setEmail((e) => e || user.email || '')
    Promise.all([getAddresses().catch(() => [] as SavedAddress[]), getProfile().catch(() => null)]).then(([list, profile]) => {
      setSaved(list)
      const ship = list.find((a) => a.isDefault) ?? list[0]
      if (ship) setShipChoice(ship.id)
      else if (profile) setShipDraft((d) => ({ ...d, firstName: d.firstName || profile.firstName, lastName: d.lastName || profile.lastName, phone: d.phone || (profile.phone ?? '') }))
      const bill = list.find((a) => a.isDefaultBilling) ?? ship
      if (bill) setBillChoice(bill.id)
      if (profile?.email) setEmail((e) => e || profile.email!)
    })
  }, [user, authLoading])

  useEffect(() => {
    getCheckoutOptions()
      .then((o) => {
        setOptions(o)
        setPaymentMethod((m) => m ?? (o.payment.razorpayEnabled ? 'razorpay' : o.payment.codEnabled ? 'cod' : null))
      })
      .catch(() => setOptions({ payment: { razorpayEnabled: true, codEnabled: true, codMin: 0, codMax: 0 }, order: { min: 0, max: 0 }, giftWrap: { fee: 49 } }))
  }, [])

  // Every line is checked up front — a missing size/option or sold-out item is flagged now,
  // not when the customer presses Pay.
  useEffect(() => {
    if (!hydrated || !items.length) return
    setCheckingCart(true)
    checkCart(cartInputs)
      .then((r) => setIssues(r.issues))
      .catch(() => setIssues([]))
      .finally(() => setCheckingCart(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, cartKey])

  const selectedShip = shipChoice !== 'new' ? saved?.find((a) => a.id === shipChoice) : undefined
  const shipAddress: AddressDraft = selectedShip ? fromSaved(selectedShip) : shipDraft
  const selectedBill = !billingSame && billChoice !== 'new' ? saved?.find((a) => a.id === billChoice) : undefined
  const billAddress: AddressDraft = selectedBill ? fromSaved(selectedBill) : billDraft
  const pricingState = shipAddress.state || undefined

  // Server pricing (shipping zone, coupon, gift wrap, GST) — the summary always shows what
  // will actually be charged.
  const priceSeq = useRef(0)
  const reprice = useCallback(async () => {
    if (!items.length || issues.length) return
    const seq = ++priceSeq.current
    setPricing(true)
    setPricingError(undefined)
    const opts = { shippingMethod, giftWrap, shippingState: pricingState }
    try {
      const res = await validateCart(cartInputs, { ...opts, couponCode })
      if (seq !== priceSeq.current) return
      setPriced(res)
      setCouponError(undefined)
    } catch (err) {
      if (seq !== priceSeq.current) return
      const message = err instanceof Error ? err.message : 'Could not price your cart'
      if (couponCode) {
        // Retry without the coupon: if that works, the coupon was the problem
        try {
          const res = await validateCart(cartInputs, opts)
          if (seq !== priceSeq.current) return
          setPriced(res)
          setCouponError(message)
          setCouponCode(undefined)
          return
        } catch {
          /* fall through */
        }
      }
      setPricingError(message)
    } finally {
      if (seq === priceSeq.current) setPricing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, shippingMethod, giftWrap, pricingState, couponCode, issues.length])
  useEffect(() => {
    if (!hydrated || checkingCart) return
    reprice()
  }, [hydrated, checkingCart, reprice])

  // ---- totals (server first, local estimate while loading) ----
  const localSubtotal = getTotalPrice()
  const subtotal = priced?.subtotal ?? localSubtotal
  const discount = priced?.discount ?? 0
  const shippingCost = priced?.shippingCost ?? null
  const giftWrapCost = priced?.giftWrapCost ?? (giftWrap ? options?.giftWrap.fee ?? 0 : 0)
  const total = priced?.total ?? localSubtotal + (giftWrap ? options?.giftWrap.fee ?? 0 : 0)
  const giftFee = priced?.giftWrapFee ?? options?.giftWrap.fee ?? 49

  // ---- payment availability ----
  const codReason = useMemo(() => {
    if (!options) return undefined
    const p = options.payment
    if (!p.codEnabled) return 'Not available right now'
    if (priced?.shipping && !priced.shipping.codAvailable) return `Not available for ${shipAddress.state || 'this area'}`
    if (p.codMin > 0 && total < p.codMin) return `Available on orders of ${formatPrice(p.codMin)} or more`
    if (p.codMax > 0 && total > p.codMax) return `Available on orders up to ${formatPrice(p.codMax)}`
    return undefined
  }, [options, priced, total, shipAddress.state])
  const onlineReason = options && !options.payment.razorpayEnabled ? 'Not available right now' : undefined
  useEffect(() => {
    if (paymentMethod === 'cod' && codReason) setPaymentMethod(onlineReason ? null : 'razorpay')
    if (paymentMethod === 'razorpay' && onlineReason) setPaymentMethod(codReason ? null : 'cod')
  }, [codReason, onlineReason, paymentMethod])
  const orderLimitError = useMemo(() => {
    if (!options) return undefined
    if (options.order.min > 0 && total < options.order.min) return `The minimum order is ${formatPrice(options.order.min)} — add ${formatPrice(options.order.min - total)} more to check out.`
    if (options.order.max > 0 && total > options.order.max) return `The maximum order is ${formatPrice(options.order.max)} — please remove some items.`
    return undefined
  }, [options, total])

  // ---- step validation ----
  const validateAddressStep = (focus = true) => {
    const eErr = validateEmail(email)
    const sErr = shipChoice === 'new' ? validateAddress(shipDraft) : {}
    const bErr = !billingSame && billChoice === 'new' ? validateAddress(billDraft) : {}
    setEmailError(eErr)
    setShipErrors(sErr)
    setBillErrors(bErr)
    const firstId = eErr ? 'co-email' : hasErrors(sErr) ? `ship-${Object.keys(sErr)[0]}` : hasErrors(bErr) ? `bill-${Object.keys(bErr)[0]}` : null
    if (firstId && focus) {
      const el = document.getElementById(firstId)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
    }
    return !firstId
  }
  const cartBlocked = issues.length > 0 || !!orderLimitError

  const goTo = (s: Step) => {
    setStep(s)
    requestAnimationFrame(() => document.getElementById(`step-${s}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const completeAddress = () => {
    setAddressTouched(true)
    if (!validateAddressStep()) {
      toast.error('Please complete the highlighted fields')
      return
    }
    setCompleted((c) => new Set(c).add('address'))
    goTo('delivery')
  }
  const completeDelivery = () => {
    if (giftMessage.length > 300) return
    setCompleted((c) => new Set(c).add('delivery'))
    goTo('payment')
  }

  const handlePlaceOrder = async () => {
    if (cartBlocked) {
      toast.error(issues.length ? 'Please fix the items flagged in your cart first' : orderLimitError)
      return
    }
    if (!validateAddressStep(false)) {
      goTo('address')
      toast.error('Please complete your address details')
      return
    }
    if (!paymentMethod) {
      setPaymentError('Choose how you’d like to pay')
      return
    }
    if (pricingError) {
      toast.error(pricingError)
      return
    }
    setPlacing(true)
    try {
      const shippingAddress = { ...toApiAddress(shipAddress), email: email.trim() }
      const billingAddress = billingSame ? undefined : toApiAddress(billAddress)
      const result = await placeOrder({
        items: cartInputs,
        shippingAddress,
        billingAddress,
        shippingMethod,
        paymentMethod,
        couponCode,
        giftWrap,
        giftMessage: giftWrap && giftMessage.trim() ? giftMessage.trim() : undefined,
        idempotencyKey: idempotencyKey.current,
      })

      // Save a newly typed address to the address book (signed-in customers)
      if (user && shipChoice === 'new' && saveToBook) {
        createAddress({ ...toApiAddress(shipDraft), addressType: shipDraft.addressType, isDefault: !saved?.length, isDefaultBilling: !saved?.length && billingSame }).catch(() => {})
      }

      const finish = (kind: 'paid' | 'pending', payment: 'cod' | 'online' | 'pending') => {
        setFinishing(kind)
        router.push(`/order-confirmation?order=${result.order.orderNumber}&payment=${payment}${user ? `&id=${result.order.id}` : ''}`)
        // Cleared behind the confirming screen; the thank-you page also clears it on arrival
        setTimeout(clearCart, 400)
      }

      if (paymentMethod === 'cod' || !result.razorpay) {
        finish('paid', 'cod')
        return
      }

      const paid = await openRazorpayPayment({
        razorpay: result.razorpay,
        orderNumber: result.order.orderNumber,
        prefill: { name: `${shipAddress.firstName} ${shipAddress.lastName}`.trim(), email: email.trim(), contact: shipAddress.phone },
        verify: async (r) => {
          setFinishing('placing')
          return verifyPayment(r)
        },
      })
      // An unpaid order is kept (the customer can pay later) — never lose it
      if (paid) finish('paid', 'online')
      else finish('pending', 'pending')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong placing your order'
      toast.error(message)
      if (/cash on delivery/i.test(message)) setPaymentError(message)
      setFinishing(null)
      setPlacing(false)
    }
  }

  // ---------- render ----------
  if (finishing) return <CheckoutFinishing kind={finishing} />
  if (!hydrated) {
    return (
      <>
        <Navbar categories={categories} />
        <main className="min-h-screen" />
      </>
    )
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar categories={categories} />
        <main className="min-h-[70vh]">
          <div className="container mx-auto flex flex-col items-center px-4 py-20 text-center">
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShoppingBag className="h-10 w-10" />
            </span>
            <h1 className="display mt-6 text-3xl">Your cart is empty</h1>
            <p className="mt-2 max-w-sm text-muted-foreground">Add some handcrafted pieces before checking out.</p>
            <Button size="lg" asChild className="mt-8 rounded-full">
              <Link href="/shop">Browse the shop</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const stateOf = (s: Step): 'active' | 'done' | 'upcoming' => (s === step ? 'active' : completed.has(s) ? 'done' : 'upcoming')
  const currentIndex = STEPS.findIndex((s) => s.id === step)
  const issueFor = (index: number) => issues.find((i) => i.index === index)
  const deliveryDays = priced?.shipping?.estimateDays ?? priced?.shippingEstimate

  const summary = (
    <div className="space-y-4">
      <ul className="max-h-[340px] space-y-4 overflow-auto pr-1">
        {items.map((item, index) => {
          const issue = issueFor(index)
          const opts = item.customizations?.length ? item.customizations.map((c) => c.displayValue).join(' · ') : item.customText ? `“${item.customText}”` : ''
          return (
            <li key={getItemKey(item)} className="flex gap-3">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-sand">
                <Image src={item.product.images[0]} alt={item.product.name} fill sizes="64px" className="object-cover" />
                <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink/80 px-1 text-[11px] font-semibold text-white">{item.quantity}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.product.name}</p>
                {opts && <p className="truncate text-xs text-muted-foreground">{opts}</p>}
                {issue && (
                  <p className="mt-1 flex items-start gap-1 text-xs font-medium text-destructive">
                    <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" /> {issue.message}
                  </p>
                )}
              </div>
              <span className="text-sm font-medium tabular-nums">{formatPrice(getItemUnitPrice(item) * item.quantity)}</span>
            </li>
          )
        })}
      </ul>

      {/* coupon */}
      <div className="border-t pt-4">
        {couponCode ? (
          <div className="flex items-center justify-between rounded-2xl bg-emerald-500/[0.08] px-3.5 py-2.5 text-sm">
            <span className="flex items-center gap-2 font-medium text-emerald-800">
              <Tag className="h-4 w-4" /> {couponCode.toUpperCase()} applied
            </span>
            <button type="button" onClick={() => { setCouponCode(undefined); setCouponInput('') }} className="rounded-full p-1 text-emerald-800 hover:bg-emerald-500/10" aria-label="Remove coupon">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const code = couponInput.trim()
              if (!code) return setCouponError('Enter a coupon code')
              setCouponError(undefined)
              setCouponCode(code.toUpperCase())
            }}
            className="space-y-1.5"
          >
            <div className="flex gap-2">
              <Input
                value={couponInput}
                onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(undefined) }}
                placeholder="Coupon code"
                aria-label="Coupon code"
                aria-invalid={couponError ? true : undefined}
                className={cn('h-10 rounded-full bg-card uppercase', couponError && 'border-destructive')}
              />
              <Button type="submit" variant="outline" className="h-10 rounded-full px-5" disabled={pricing}>
                Apply
              </Button>
            </div>
            {couponError && <p className="text-xs font-medium text-destructive">{couponError}</p>}
          </form>
        )}
      </div>

      <div className="space-y-2 border-t pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Discount</span>
            <span className="tabular-nums">−{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Truck className="h-3.5 w-3.5" /> Shipping
          </span>
          <span className="tabular-nums">
            {shippingCost === null || !shipAddress.state ? <span className="text-muted-foreground">{shipAddress.state ? '…' : 'Enter address'}</span> : shippingCost === 0 ? <span className="text-emerald-700">Free</span> : formatPrice(shippingCost)}
          </span>
        </div>
        {giftWrap && (
          <div className="flex justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Gift className="h-3.5 w-3.5" /> Gift wrap
            </span>
            <span className="tabular-nums">{formatPrice(giftWrapCost)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t pt-3">
          <span className="font-semibold">Total</span>
          <span className="flex items-center gap-2 font-serif text-2xl tabular-nums">
            {pricing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={total} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.25 }}>
                {formatPrice(total)}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
        {(priced?.taxAmount ?? 0) > 0 && <p className="text-right text-xs text-muted-foreground">Includes {formatPrice(priced!.taxAmount!)} GST</p>}
        {pricingError && !issues.length && <p className="rounded-xl bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">{pricingError}</p>}
      </div>
    </div>
  )

  return (
    <>
      <Navbar categories={categories} />
      <main className="min-h-screen bg-gradient-to-b from-primary/[0.04] to-transparent">
        <div className="container mx-auto px-4 py-6 sm:py-10">
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/cart" className="hover:text-foreground">Cart</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">Checkout</span>
          </nav>
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Secure checkout</p>
              <h1 className="display mt-1 text-3xl sm:text-4xl">
                Almost yours<span className="text-primary">.</span>
              </h1>
            </div>
            <CheckoutProgress index={currentIndex} done={(i) => completed.has(STEPS[i].id)} />
          </div>

          {/* cart problems block checkout — shown before anything else */}
          {issues.length > 0 && (
            <div role="alert" className="mb-6 rounded-3xl border border-destructive/25 bg-destructive/[0.04] p-5">
              <p className="flex items-center gap-2 font-semibold text-destructive">
                <AlertTriangle className="h-5 w-5" /> {issues.length === 1 ? 'An item in your cart needs attention' : `${issues.length} items in your cart need attention`}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {issues.map((i) => (
                  <li key={i.index}>
                    <span className="font-medium">{items[i.index]?.product.name}</span>: {i.message}
                    {i.kind === 'options' && items[i.index] && (
                      <Link href={`/product/${items[i.index].product.slug}`} className="ml-2 font-semibold text-primary hover:underline">
                        Choose options
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" size="sm" className="mt-3 rounded-full">
                <Link href="/cart">Review cart</Link>
              </Button>
            </div>
          )}

          {/* mobile summary toggle */}
          <div className="mb-5 overflow-hidden rounded-3xl border bg-card lg:hidden">
            <button type="button" onClick={() => setSummaryOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium" aria-expanded={summaryOpen}>
              <span className="flex items-center gap-2 text-primary">
                <ShoppingBag className="h-4 w-4" /> {summaryOpen ? 'Hide' : 'Show'} order summary
                <ChevronDown className={cn('h-4 w-4 transition-transform', summaryOpen && 'rotate-180')} />
              </span>
              <span className="font-serif text-lg tabular-nums">{formatPrice(total)}</span>
            </button>
            {summaryOpen && <div className="border-t px-5 py-5">{summary}</div>}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
            <div className="min-w-0 space-y-4">
              {/* ---------- 1. address ---------- */}
              <div id="step-address" className="scroll-mt-28">
                <StepCard
                  index={1}
                  title="Contact & delivery address"
                  state={stateOf('address')}
                  onEdit={() => goTo('address')}
                  summary={
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deliver to</p>
                        <AddressLines a={shipAddress} compact />
                        <p className="mt-1 text-muted-foreground">{email}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billing</p>
                        {billingSame ? <p className="text-muted-foreground">Same as delivery address</p> : <AddressLines a={billAddress} compact />}
                      </div>
                    </div>
                  }
                >
                  <div className="space-y-6">
                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="font-medium">Contact</h3>
                        {!user && !authLoading && (
                          <Link href="/login?redirect=/checkout" className="text-sm font-semibold text-primary hover:underline">
                            Sign in for faster checkout
                          </Link>
                        )}
                      </div>
                      <Field label="Email" htmlFor="co-email" error={emailError} hint="We’ll send your order confirmation and invoice here">
                        <Input
                          id="co-email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value)
                            if (addressTouched) setEmailError(validateEmail(e.target.value))
                          }}
                          placeholder="you@example.com"
                          {...invalidProps('co-email', emailError)}
                          className={cn('h-11 rounded-xl bg-card', emailError && 'border-destructive')}
                        />
                      </Field>
                    </div>

                    <div>
                      <h3 className="mb-3 font-medium">Delivery address</h3>
                      {saved === null ? (
                        <div className="h-28 animate-pulse rounded-2xl bg-muted/70" />
                      ) : (
                        <div className="space-y-3">
                          {saved.length > 0 && (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {saved.map((a) => (
                                <AddressOption key={a.id} a={a} name="ship" selected={shipChoice === a.id} onSelect={() => setShipChoice(a.id)} />
                              ))}
                              <button
                                type="button"
                                onClick={() => setShipChoice('new')}
                                className={cn(
                                  'flex min-h-28 items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm font-medium transition-colors',
                                  shipChoice === 'new' ? 'border-primary bg-primary/[0.04] text-primary' : 'text-muted-foreground hover:border-primary/50 hover:text-primary'
                                )}
                              >
                                <Plus className="h-4 w-4" /> Use a new address
                              </button>
                            </div>
                          )}
                          {shipChoice === 'new' && (
                            <div className={cn(saved.length > 0 && 'rounded-2xl border bg-muted/20 p-4 sm:p-5')}>
                              <AddressForm
                                idPrefix="ship"
                                value={shipDraft}
                                onChange={(v) => {
                                  setShipDraft(v)
                                  if (addressTouched) setShipErrors(validateAddress(v))
                                }}
                                errors={shipErrors}
                                showType={!!user}
                                onBlurField={(f) => {
                                  const e = validateAddress(shipDraft)
                                  if (shipDraft[f]) setShipErrors((prev) => ({ ...prev, [f]: e[f as keyof typeof e] }))
                                }}
                              />
                              {user && (
                                <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm">
                                  <Checkbox checked={saveToBook} onCheckedChange={(c) => setSaveToBook(c === true)} />
                                  Save this address to my account
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
                        <Checkbox checked={billingSame} onCheckedChange={(c) => setBillingSame(c === true)} />
                        Billing address is the same as delivery
                      </label>
                      {!billingSame && (
                        <div className="mt-4 space-y-3">
                          <h3 className="font-medium">Billing address</h3>
                          {saved && saved.length > 0 && (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {saved.map((a) => (
                                <AddressOption key={a.id} a={a} name="bill" selected={billChoice === a.id} onSelect={() => setBillChoice(a.id)} />
                              ))}
                              <button
                                type="button"
                                onClick={() => setBillChoice('new')}
                                className={cn(
                                  'flex min-h-28 items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm font-medium transition-colors',
                                  billChoice === 'new' ? 'border-primary bg-primary/[0.04] text-primary' : 'text-muted-foreground hover:border-primary/50 hover:text-primary'
                                )}
                              >
                                <Plus className="h-4 w-4" /> Use a different address
                              </button>
                            </div>
                          )}
                          {billChoice === 'new' && (
                            <div className="rounded-2xl border bg-muted/20 p-4 sm:p-5">
                              <AddressForm
                                idPrefix="bill"
                                value={billDraft}
                                onChange={(v) => {
                                  setBillDraft(v)
                                  if (addressTouched) setBillErrors(validateAddress(v))
                                }}
                                errors={billErrors}
                                showType={false}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <Button onClick={completeAddress} size="lg" className="h-12 w-full rounded-full" disabled={issues.length > 0}>
                      Continue to delivery
                    </Button>
                  </div>
                </StepCard>
              </div>

              {/* ---------- 2. delivery ---------- */}
              <div id="step-delivery" className="scroll-mt-28">
                <StepCard
                  index={2}
                  title="Delivery"
                  state={stateOf('delivery')}
                  onEdit={() => goTo('delivery')}
                  summary={
                    <p>
                      {shippingMethod === 'express' ? 'Express' : 'Standard'} delivery
                      {deliveryDays ? ` · ${deliveryDays.min}–${deliveryDays.max} days after dispatch` : ''}
                      {giftWrap && ' · Gift wrapped'}
                    </p>
                  }
                >
                  <div className="space-y-5">
                    <div role="radiogroup" aria-label="Delivery speed" className="grid gap-3 sm:grid-cols-2">
                      {(['standard', 'express'] as const).map((m) => {
                        const fee = m === 'standard' ? priced?.shipping?.standardFee : priced?.shipping?.expressFee
                        const days = priced?.shipping?.estimateDays
                        const sel = shippingMethod === m
                        return (
                          <label key={m} className={cn('flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors', sel ? 'border-primary bg-primary/[0.04] ring-1 ring-primary/25' : 'hover:border-primary/40')}>
                            <input type="radio" name="ship-method" checked={sel} onChange={() => setShippingMethod(m)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
                            <div className="flex-1">
                              <p className="flex items-center justify-between gap-2 font-medium">
                                {m === 'standard' ? 'Standard' : 'Express'}
                                <span className="tabular-nums">{fee === undefined ? '…' : fee === 0 ? <span className="text-emerald-700">Free</span> : formatPrice(fee)}</span>
                              </p>
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                {m === 'standard' ? (days ? `${days.min}–${days.max} days after dispatch` : 'Reliable courier delivery') : 'Priority dispatch with a faster courier'}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                    {priced?.shipping?.freeShippingApplied && <p className="flex items-center gap-2 text-sm text-emerald-700"><Check className="h-4 w-4" /> You’ve unlocked free shipping</p>}
                    <p className="text-xs text-muted-foreground">Handmade and made-to-order pieces are dispatched once they’re finished — see each product for its making time.</p>

                    <div className="rounded-2xl bg-secondary/15 p-4">
                      <label className="flex cursor-pointer items-start gap-3">
                        <Checkbox checked={giftWrap} onCheckedChange={(c) => setGiftWrap(c === true)} className="mt-0.5" />
                        <span className="flex-1">
                          <span className="flex items-center gap-2 font-medium">
                            <Gift className="h-4 w-4 text-primary" /> Gift wrap it (+{formatPrice(giftFee)})
                          </span>
                          <span className="mt-0.5 block text-sm text-muted-foreground">Handmade wrapping with a handwritten note. Prices are hidden inside.</span>
                        </span>
                      </label>
                      {giftWrap && (
                        <div className="mt-3">
                          <Field label="Gift message" htmlFor="gift-msg" optional error={giftMessage.length > 300 ? 'Keep your message under 300 characters' : undefined}>
                            <Textarea id="gift-msg" value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} rows={3} placeholder="Happy birthday! Made with love…" className="rounded-xl bg-card" />
                          </Field>
                          <p className="mt-1 text-right text-xs text-muted-foreground">{giftMessage.length}/300</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" size="lg" className="h-12 rounded-full" onClick={() => goTo('address')}>
                        Back
                      </Button>
                      <Button size="lg" className="h-12 flex-1 rounded-full" onClick={completeDelivery} disabled={issues.length > 0}>
                        Continue to payment
                      </Button>
                    </div>
                  </div>
                </StepCard>
              </div>

              {/* ---------- 3. payment ---------- */}
              <div id="step-payment" className="scroll-mt-28">
                <StepCard index={3} title="Payment" state={stateOf('payment')}>
                  <div className="space-y-5">
                    <div role="radiogroup" aria-label="Payment method" className="space-y-3">
                      {[
                        { id: 'razorpay' as const, name: 'Pay online', note: 'UPI, cards, net banking & wallets via Razorpay', icon: Wallet, reason: onlineReason },
                        { id: 'cod' as const, name: 'Cash on delivery', note: 'Pay in cash or UPI when your order arrives', icon: Banknote, reason: codReason },
                      ].map((m) => {
                        const sel = paymentMethod === m.id
                        return (
                          <label
                            key={m.id}
                            className={cn(
                              'flex items-center gap-3 rounded-2xl border p-4 transition-colors',
                              m.reason ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                              sel ? 'border-primary bg-primary/[0.04] ring-1 ring-primary/25' : !m.reason && 'hover:border-primary/40'
                            )}
                          >
                            <input
                              type="radio"
                              name="pay"
                              disabled={!!m.reason}
                              checked={sel}
                              onChange={() => {
                                setPaymentMethod(m.id)
                                setPaymentError(undefined)
                              }}
                              className="h-4 w-4 accent-[var(--primary)]"
                            />
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <m.icon className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">{m.name}</span>
                              <span className="block text-sm text-muted-foreground">{m.reason ?? m.note}</span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    {paymentError && <p role="alert" className="text-sm font-medium text-destructive">{paymentError}</p>}
                    {orderLimitError && <p role="alert" className="rounded-2xl bg-amber-400/15 px-4 py-3 text-sm text-amber-900">{orderLimitError}</p>}

                    <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4 text-sm">
                      <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                      Payments are processed securely by Razorpay — we never see or store your card details.
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" size="lg" className="h-12 rounded-full" onClick={() => goTo('delivery')} disabled={placing}>
                        Back
                      </Button>
                      <Button size="lg" className="h-12 flex-1 rounded-full text-[15px]" onClick={handlePlaceOrder} disabled={placing || pricing || cartBlocked || !paymentMethod}>
                        {placing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Placing order…
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" /> {paymentMethod === 'cod' ? `Place order · ${formatPrice(total)}` : `Pay ${formatPrice(total)}`}
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-center text-xs text-muted-foreground">
                      By placing your order you agree to our <Link href="/terms" className="underline">terms</Link> and <Link href="/refund-policy" className="underline">refund policy</Link>.
                    </p>
                  </div>
                </StepCard>
              </div>
            </div>

            {/* ---------- summary ---------- */}
            <aside className="hidden lg:block">
              <div className="sticky top-28 rounded-3xl border bg-card p-6 shadow-[0_18px_50px_-34px_rgb(49_32_140/0.45)]">
                <h2 className="mb-4 flex items-center justify-between text-[17px] font-semibold">
                  Order summary
                  <Link href="/cart" className="text-sm font-semibold text-primary hover:underline">
                    Edit cart
                  </Link>
                </h2>
                {summary}
                {shipAddress.state && (
                  <p className="mt-4 flex items-center gap-1.5 border-t pt-4 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> Delivering to {shipAddress.city ? `${shipAddress.city}, ` : ''}
                    {shipAddress.state}
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
