import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface TrendChartProps {
  data: any[]
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <Card className="col-span-full md:col-span-4">
      <CardHeader>
        <CardTitle>Live Telemetry Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] sm:h-[300px] md:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="temp" stroke="#8884d8" name="Zone 1 Temp (°C)" />
            <Line yAxisId="left" type="monotone" dataKey="oilTemp" stroke="#ef4444" name="Oil Temp (°C)" />
            {data.some(d => d.pressure !== null) && (
              <Line yAxisId="right" type="monotone" dataKey="pressure" stroke="#82ca9d" name="Pressure (bar)" />
            )}
            {data.some(d => d.cycleTime !== null) && (
              <Line yAxisId="right" type="monotone" dataKey="cycleTime" stroke="#ffc658" name="Cycle Time (s)" />
            )}
          </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
