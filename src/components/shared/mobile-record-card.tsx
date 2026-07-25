import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MobileRecordCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function MobileRecordCard({ children, className, ...props }: MobileRecordCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)} {...props}>
      <CardContent className="space-y-3 p-4">{children}</CardContent>
    </Card>
  )
}
