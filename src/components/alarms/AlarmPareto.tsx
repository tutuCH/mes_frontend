import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Mold Protection', count: 45 },
  { name: 'Temp Deviation', count: 32 },
  { name: 'Pressure Low', count: 28 },
  { name: 'Door Open', count: 15 },
  { name: 'Ejector Fault', count: 12 },
]

export function AlarmPareto() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Alarm Causes (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={100} fontSize={12} />
            <Tooltip />
            <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
