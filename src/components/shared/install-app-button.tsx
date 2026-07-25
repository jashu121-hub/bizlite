'use client'

import * as React from 'react'
import { Download, Share, PlusSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'bizlite-install-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const iosStandalone =
    'standalone' in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  const displayStandalone = window.matchMedia('(display-mode: standalone)').matches
  return iosStandalone || displayStandalone
}

function isIos(): boolean {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
}

interface InstallAppButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showLabel?: boolean
}

export function InstallAppButton({
  variant = 'outline',
  size = 'default',
  className,
  showLabel = true,
}: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [iosInstructionsOpen, setIosInstructionsOpen] = React.useState(false)
  const [hidden, setHidden] = React.useState(true)

  React.useEffect(() => {
    if (isStandalone()) {
      setHidden(true)
      return
    }

    if (localStorage.getItem(DISMISS_KEY) === 'true') {
      setHidden(true)
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setHidden(false)
    }

    const handleInstalled = () => {
      setDeferredPrompt(null)
      setHidden(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)

    if (isIos() && !isStandalone() && localStorage.getItem(DISMISS_KEY) !== 'true') {
      setHidden(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (isIos()) {
      setIosInstructionsOpen(true)
      return
    }

    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice

    setDeferredPrompt(null)

    if (choice.outcome === 'accepted') {
      setHidden(true)
    } else {
      localStorage.setItem(DISMISS_KEY, 'true')
      setHidden(true)
    }
  }

  const handleDismissInstructions = () => {
    setIosInstructionsOpen(false)
    localStorage.setItem(DISMISS_KEY, 'true')
    setHidden(true)
  }

  if (hidden) return null

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => void handleInstall()}
        className={cn(className)}
        aria-label={`Install ${APP_NAME}`}
      >
        <Download className="h-4 w-4" />
        {showLabel ? <span>Install {APP_NAME}</span> : null}
      </Button>

      <Dialog open={iosInstructionsOpen} onOpenChange={setIosInstructionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install {APP_NAME}</DialogTitle>
            <DialogDescription>
              Add {APP_NAME} to your home screen for quick access.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
            <li className="flex items-start gap-3">
              <Share className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
              <span>
                Tap the <strong>Share</strong> button in Safari&apos;s toolbar.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <PlusSquare className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
              <span>
                Scroll down and tap <strong>Add to Home Screen</strong>.
              </span>
            </li>
          </ol>
          <Button type="button" variant="secondary" onClick={handleDismissInstructions}>
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
