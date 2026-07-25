import { Skeleton } from '@/components/ui/skeleton'

export default function ExpensesLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading expenses">
      <div className="flex justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}
