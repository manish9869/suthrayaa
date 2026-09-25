'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, MapPin, MoreHorizontal, Pencil, Plus, RotateCcw, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AccountPageHeader, EmptyBlock, useAccount } from '@/components/account/account-shell'
import { AddressForm, EMPTY_ADDRESS, type AddressDraft } from '@/components/account/address-form'
import { AddressLines, AddressTypeTag } from '@/components/account/address-card'
import { createAddress, deleteAddress, fieldErrorsFrom, getAddresses, updateAddress, type SavedAddress } from '@/lib/api/account'
import { hasErrors, validateAddress, type FieldErrors } from '@/lib/validation'
import { cn } from '@/lib/utils'

const toDraft = (a: SavedAddress): AddressDraft => ({
  label: a.label ?? '',
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
  isDefault: a.isDefault,
  isDefaultBilling: a.isDefaultBilling,
})

export default function AddressesPage() {
  const { profile } = useAccount()
  const [list, setList] = useState<SavedAddress[] | null>(null)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<SavedAddress | 'new' | null>(null)
  const [draft, setDraft] = useState<AddressDraft>(EMPTY_ADDRESS)
  const [errors, setErrors] = useState<FieldErrors<keyof AddressDraft>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<SavedAddress | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(false)
    getAddresses()
      .then(setList)
      .catch(() => setError(true))
  }, [])
  useEffect(load, [load])

  const openNew = () => {
    setDraft({
      ...EMPTY_ADDRESS,
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      phone: profile?.phone ?? '',
      isDefault: !list?.length,
      isDefaultBilling: !list?.length,
    })
    setErrors({})
    setSubmitted(false)
    setEditing('new')
  }
  const openEdit = (a: SavedAddress) => {
    setDraft(toDraft(a))
    setErrors({})
    setSubmitted(false)
    setEditing(a)
  }

  const onChange = (next: AddressDraft) => {
    setDraft(next)
    if (submitted) setErrors(validateAddress(next))
  }

  const save = async () => {
    setSubmitted(true)
    const e = validateAddress(draft)
    setErrors(e)
    if (hasErrors(e)) {
      document.getElementById(`addr-${Object.keys(e)[0]}`)?.focus()
      return
    }
    setSaving(true)
    const body = {
      ...draft,
      label: draft.label || undefined,
      addressLine2: draft.addressLine2 || undefined,
      landmark: draft.landmark || undefined,
    }
    try {
      if (editing === 'new') await createAddress(body)
      else if (editing) await updateAddress(editing.id, body)
      toast.success(editing === 'new' ? 'Address added' : 'Address updated')
      setEditing(null)
      load()
    } catch (err) {
      const fe = fieldErrorsFrom(err)
      if (Object.keys(fe).length) setErrors(fe as FieldErrors<keyof AddressDraft>)
      toast.error(err instanceof Error && !Object.keys(fe).length ? err.message : 'Please check the highlighted fields')
    } finally {
      setSaving(false)
    }
  }

  const makeDefault = async (a: SavedAddress, kind: 'shipping' | 'billing') => {
    setBusyId(a.id)
    try {
      await updateAddress(a.id, kind === 'shipping' ? { isDefault: true } : { isDefaultBilling: true })
      toast.success(kind === 'shipping' ? 'Default delivery address updated' : 'Default billing address updated')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the address')
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setBusyId(toDelete.id)
    try {
      await deleteAddress(toDelete.id)
      toast.success('Address removed')
      setToDelete(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove the address')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <AccountPageHeader
        title="Addresses"
        description="Your saved delivery and billing addresses. The default is picked automatically at checkout."
        action={
          list && list.length > 0 ? (
            <Button onClick={openNew} className="rounded-full">
              <Plus className="h-4 w-4" /> Add address
            </Button>
          ) : undefined
        }
      />

      {error ? (
        <EmptyBlock icon={RotateCcw} title="Couldn’t load your addresses" text="Please try again." action={<Button onClick={load} className="rounded-full">Try again</Button>} />
      ) : !list ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-3xl bg-muted/70" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyBlock
          icon={MapPin}
          title="No saved addresses"
          text="Save an address to check out faster — we’ll fill it in for you next time."
          action={
            <Button onClick={openNew} className="rounded-full">
              <Plus className="h-4 w-4" /> Add your first address
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {list.map((a) => (
            <article
              key={a.id}
              className={cn(
                'relative flex flex-col rounded-3xl border bg-card p-5 shadow-[0_1px_2px_rgb(49_32_140/0.04)]',
                a.isDefault && 'border-primary/40 ring-1 ring-primary/15'
              )}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2 pr-10">
                <AddressTypeTag a={a} />
                {a.isDefault && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-primary">Default delivery</span>}
                {a.isDefaultBilling && <span className="rounded-full bg-secondary/25 px-2.5 py-0.5 text-[11.5px] font-semibold text-[color-mix(in_oklab,var(--secondary)_45%,var(--foreground))]">Default billing</span>}
              </div>
              <AddressLines a={a} />
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <Button size="sm" variant="outline" className="h-9 rounded-full" onClick={() => openEdit(a)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                {!a.isDefault && (
                  <Button size="sm" variant="ghost" className="h-9 rounded-full" disabled={busyId === a.id} onClick={() => makeDefault(a, 'shipping')}>
                    <Star className="h-3.5 w-3.5" /> Set as default
                  </Button>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="absolute right-3 top-3 h-9 w-9 rounded-full" aria-label="More actions">
                    {busyId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                  <DropdownMenuItem onClick={() => openEdit(a)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  {!a.isDefault && (
                    <DropdownMenuItem onClick={() => makeDefault(a, 'shipping')}>
                      <Star className="h-4 w-4" /> Default delivery address
                    </DropdownMenuItem>
                  )}
                  {!a.isDefaultBilling && (
                    <DropdownMenuItem onClick={() => makeDefault(a, 'billing')}>
                      <Star className="h-4 w-4" /> Default billing address
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setToDelete(a)} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4" /> Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </article>
          ))}
          <button
            type="button"
            onClick={openNew}
            className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="h-5 w-5" />
            </span>
            Add a new address
          </button>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && !saving && setEditing(null)}>
        <DialogContent className="max-h-[92svh] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-normal">{editing === 'new' ? 'Add an address' : 'Edit address'}</DialogTitle>
            <DialogDescription>We deliver across India. All fields except those marked optional are required.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
            noValidate
          >
            <AddressForm value={draft} onChange={onChange} errors={errors} showDefaults />
            <DialogFooter className="mt-6 gap-2">
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editing === 'new' ? 'Save address' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this address?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && `${toDelete.addressLine1}, ${toDelete.city}`} will be removed from your address book. Past orders keep their address.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Keep</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
