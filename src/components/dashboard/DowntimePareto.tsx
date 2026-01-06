import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComingSoon } from '@/components/ui/coming-soon'

export function DowntimePareto() {
  return (
    <Card className="col-span-full md:col-span-4">
      <CardHeader>
        <CardTitle>Top Downtime Reasons (Last 24h)</CardTitle>
      </CardHeader>
      <CardContent>
        <ComingSoon
          title="Downtime analytics coming soon"
          description="Backend API for downtime tracking is not yet available"
        />
      </CardContent>
    </Card>
  )
}
