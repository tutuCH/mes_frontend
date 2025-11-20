import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

// Mock Risk Data
const riskData = [
  { id: 'M-004', name: 'Injection Press 4', riskScore: 85, component: 'Hydraulic Pump', prediction: 'Failure in < 48h' },
  { id: 'M-012', name: 'Injection Press 12', riskScore: 72, component: 'Heater Band', prediction: 'Degradation Detected' },
  { id: 'M-007', name: 'Injection Press 7', riskScore: 65, component: 'Screw Tip', prediction: 'Wear Limit Approaching' },
  { id: 'M-001', name: 'Injection Press 1', riskScore: 45, component: 'Clamp Unit', prediction: 'Maintenance Due Soon' },
  { id: 'M-015', name: 'Injection Press 15', riskScore: 30, component: 'Cooling System', prediction: 'Normal Operation' },
]

export function PredictiveRiskList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Predictive Maintenance Risk</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Machine</TableHead>
              <TableHead>At Risk Component</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead>AI Prediction</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {riskData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.component}</TableCell>
                <TableCell className="w-[200px]">
                  <div className="flex items-center gap-2">
                    <Progress value={item.riskScore} className={`h-2 ${
                      item.riskScore > 80 ? 'bg-red-100' : item.riskScore > 60 ? 'bg-yellow-100' : 'bg-green-100'
                    }`} />
                    <span className={`text-xs font-bold ${
                      item.riskScore > 80 ? 'text-red-600' : item.riskScore > 60 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {item.riskScore}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={item.riskScore > 80 ? 'destructive' : 'outline'}>
                    {item.prediction}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
