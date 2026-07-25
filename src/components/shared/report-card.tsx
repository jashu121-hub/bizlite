import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ReportCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function ReportCard({ title, children, className }: ReportCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}
