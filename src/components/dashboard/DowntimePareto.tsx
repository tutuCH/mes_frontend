import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Mold Change', minutes: 120 },
  { name: 'No Material', minutes: 85 },
  { name: 'Machine Fault', minutes: 45 },
  { name: 'Quality Check', minutes: 30 },
  { name: 'Break', minutes: 20 },
]

export function DowntimePareto() {
  return (
    <Card className="col-span-full md:col-span-4">
      <CardHeader>
        <CardTitle>Top Downtime Reasons (Last 24h)</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[250px] sm:h-[300px] md:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#888888" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}m`}
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px' }}
            />
            <Bar dataKey="minutes" fill="#0f172a" radius={[4, 4, 0, 0]} />
          </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
