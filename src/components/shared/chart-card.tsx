import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { BarChart3 } from 'lucide-react'

interface ChartCardProps {
  title: string
  children: React.ReactNode
  empty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

export function ChartCard({
  title,
  children,
  empty = false,
  emptyTitle = 'No chart data',
  emptyDescription = 'Data will appear here once available.',
  className,
}: ChartCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <EmptyState
            icon={BarChart3}
            title={emptyTitle}
            description={emptyDescription}
            className="border-none bg-transparent py-8"
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
