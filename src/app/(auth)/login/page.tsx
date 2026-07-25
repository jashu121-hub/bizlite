import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

import LoginPage from './login-page'

function LoginFallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="mx-auto h-6 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPage />
    </Suspense>
  )
}
