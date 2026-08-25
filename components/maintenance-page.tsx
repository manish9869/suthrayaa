import Image from 'next/image'

export function MaintenancePage({ title, message, imageUrl }: { title?: string; message?: string; imageUrl?: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      {imageUrl ? (
        <Image src={imageUrl} alt="" width={160} height={160} className="rounded-full object-cover" />
      ) : (
        <p className="font-serif text-3xl font-bold tracking-tight text-foreground">Suthrayaa</p>
      )}
      <h1 className="font-serif text-2xl font-bold text-foreground">{title || "We're upgrading Suthrayaa"}</h1>
      <p className="max-w-md text-muted-foreground">{message || "We'll be back shortly."}</p>
    </main>
  )
}
