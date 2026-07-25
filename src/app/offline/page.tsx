import Link from 'next/link'
import { WifiOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/constants'

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-6 py-safe text-center dark:bg-zinc-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
        <WifiOff className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {APP_NAME} needs an internet connection for live data. Reconnect and try again, or return
        home to browse cached pages.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  )
}
