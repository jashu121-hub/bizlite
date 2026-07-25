'use client'

import * as React from 'react'
import { WifiOff } from 'lucide-react'

import { cn } from '@/lib/utils'

interface OfflineBannerProps {
  className?: string
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const [offline, setOffline] = React.useState(false)

  React.useEffect(() => {
    const updateStatus = () => setOffline(!navigator.onLine)

    updateStatus()
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white',
        className,
      )}
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>You are offline. Changes will sync when you reconnect.</span>
    </div>
  )
}
