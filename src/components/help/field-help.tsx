'use client'

import Link from 'next/link'
import { HelpCircle } from 'lucide-react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type FieldHelpProps = {
  label: string
  text: string
  guideHref: string
  className?: string
}

export function FieldHelp({ label, text, guideHref, className }: FieldHelpProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-teal-700/80 transition-colors hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600',
            className,
          )}
          aria-label={`Help: ${label}`}
          title={text}
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2 p-3 text-sm">
        <p className="font-medium text-zinc-900">{label}</p>
        <p className="text-zinc-600">{text}</p>
        <Link
          href={guideHref}
          className="inline-flex text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline"
        >
          View Full Guide
        </Link>
      </PopoverContent>
    </Popover>
  )
}

export function FieldLabelWithHelp({
  htmlFor,
  children,
  help,
}: {
  htmlFor?: string
  children: React.ReactNode
  help: FieldHelpProps
}) {
  return (
    <div className="flex items-center gap-1.5">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-sm font-medium leading-none">
          {children}
        </label>
      ) : (
        <span className="text-sm font-medium leading-none">{children}</span>
      )}
      <FieldHelp {...help} />
    </div>
  )
}
