import { APP_NAME_MARK, APP_TAGLINE, APP_YEAR } from '@/lib/constants'
import { cn } from '@/lib/utils'

type AppBrandProps = {
  className?: string
  showTagline?: boolean
  align?: 'start' | 'center'
  /** sidebar = dark teal bar; light = auth/setup; compact = tight header */
  tone?: 'sidebar' | 'light' | 'compact'
}

export function AppBrand({
  className,
  showTagline = false,
  align = 'start',
  tone = 'light',
}: AppBrandProps) {
  const markClass =
    tone === 'sidebar'
      ? 'text-white'
      : tone === 'compact'
        ? 'text-zinc-900'
        : 'text-teal-800 dark:text-teal-300'

  const badgeClass =
    tone === 'sidebar'
      ? 'bg-white/15 text-emerald-50 ring-1 ring-white/20'
      : 'bg-teal-700 text-white'

  const taglineClass =
    tone === 'sidebar' ? 'text-emerald-100/70' : 'text-muted-foreground'

  return (
    <div
      className={cn(
        'min-w-0',
        align === 'center' && 'flex flex-col items-center text-center',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <span
          className={cn(
            'truncate font-bold tracking-tight',
            tone === 'compact' ? 'text-base' : 'text-lg sm:text-xl',
            markClass,
          )}
        >
          {APP_NAME_MARK}
        </span>
        <span
          className={cn(
            'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wide sm:text-[11px]',
            badgeClass,
          )}
          aria-label={APP_YEAR}
        >
          {APP_YEAR}
        </span>
      </div>
      {showTagline ? (
        <p className={cn('mt-0.5 truncate text-xs', taglineClass)}>{APP_TAGLINE}</p>
      ) : null}
    </div>
  )
}
