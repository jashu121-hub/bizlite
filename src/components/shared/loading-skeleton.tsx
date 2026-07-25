import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type LoadingSkeletonVariant = 'cards' | 'list' | 'table'

interface LoadingSkeletonProps {
  variant?: LoadingSkeletonVariant
  count?: number
  className?: string
}

function CardsSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ListSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-6 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TableSkeleton({ count }: { count: number }) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="hidden sm:grid sm:grid-cols-4 sm:gap-4 sm:border-b sm:border-zinc-200 sm:pb-3 dark:sm:border-zinc-800">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function LoadingSkeleton({
  variant = 'list',
  count = 5,
  className,
}: LoadingSkeletonProps) {
  return (
    <div className={cn(className)} aria-busy="true" aria-label="Loading content">
      {variant === 'cards' ? <CardsSkeleton count={count} /> : null}
      {variant === 'list' ? <ListSkeleton count={count} /> : null}
      {variant === 'table' ? <TableSkeleton count={count} /> : null}
    </div>
  )
}
