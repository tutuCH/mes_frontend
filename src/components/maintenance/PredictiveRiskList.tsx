import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComingSoon } from '@/components/ui/coming-soon'

export function PredictiveRiskList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Predictive Maintenance Risk</CardTitle>
      </CardHeader>
      <CardContent>
        <ComingSoon
          title="Predictive maintenance coming soon"
          description="AI-powered risk prediction is not yet available"
        />
      </CardContent>
    </Card>
  )
}
