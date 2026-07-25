'use client'

import { X } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function ProductModalShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'flex flex-col gap-0 overflow-hidden border-zinc-200/80 bg-white p-0 shadow-xl',
          'top-auto bottom-0 left-0 right-0 h-[min(92vh,100%)] max-h-[92vh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none',
          'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
          'sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:right-auto sm:h-auto sm:max-h-[90vh] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl',
          'sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%] sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]',
          wide ? 'sm:max-w-[720px]' : 'sm:max-w-[520px]',
        )}
      >
        <div className="relative shrink-0 border-b border-zinc-100 px-5 py-4 pr-12">
          <DialogTitle className="text-lg font-semibold text-zinc-900">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="mt-1 text-sm text-zinc-500">
              {description}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
          <button
            type="button"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
