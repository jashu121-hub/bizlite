import { Skeleton } from '@/components/ui/skeleton'

export default function SalesLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading sales">
      <div className="flex justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}
