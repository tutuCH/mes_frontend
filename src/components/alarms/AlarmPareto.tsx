import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComingSoon } from '@/components/ui/coming-soon'

export function AlarmPareto() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Alarm Causes (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ComingSoon
          title="Alarm analytics coming soon"
          description="Backend API for alarm history is not yet available"
        />
      </CardContent>
    </Card>
  )
}
