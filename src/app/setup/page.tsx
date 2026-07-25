import { redirect } from 'next/navigation'

import { SetupForm } from '@/components/auth/setup-form'
import { APP_NAME } from '@/lib/constants'
import { getUserProfile } from '@/lib/auth'

export default async function SetupPage() {
  const { profile } = await getUserProfile()

  if (profile?.setupCompleted) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-teal-50/80 via-zinc-50 to-zinc-100 px-4 py-safe dark:from-teal-950/30 dark:via-zinc-950 dark:to-zinc-900">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-8">
        <div className="mb-8 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700 text-2xl font-bold text-white shadow-lg shadow-teal-700/25">
            B
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-teal-800 dark:text-teal-300">
            Welcome to {APP_NAME}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tell us about your business to personalize your workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-6 shadow-xl shadow-zinc-900/5 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90 sm:p-8">
          <SetupForm />
        </div>
      </div>
    </div>
  )
}
