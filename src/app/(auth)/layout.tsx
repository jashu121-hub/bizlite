import Link from 'next/link'

import { APP_NAME } from '@/lib/constants'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-teal-50/80 via-zinc-50 to-zinc-100 px-4 py-safe dark:from-teal-950/30 dark:via-zinc-950 dark:to-zinc-900">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700 text-2xl font-bold text-white shadow-lg shadow-teal-700/25">
              B
            </span>
            <span className="text-2xl font-bold tracking-tight text-teal-800 dark:text-teal-300">
              {APP_NAME}
            </span>
            <span className="text-sm text-muted-foreground">Simple business management</span>
          </Link>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-6 shadow-xl shadow-zinc-900/5 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
