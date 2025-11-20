import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface ControlChartProps {
  title: string
  data: Array<{ id: number; value: number }>
  ucl: number
  lcl: number
  mean: number
  unit: string
}

export function ControlChart({ title, data, ucl, lcl, mean, unit }: ControlChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="id" hide />
              <YAxis domain={[lcl - (ucl - lcl) * 0.2, ucl + (ucl - lcl) * 0.2]} />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, 'Value']}
                labelFormatter={(label) => `Sample #${label}`}
              />
              
              {/* Control Limits */}
              <ReferenceLine y={ucl} stroke="red" strokeDasharray="3 3" label={{ value: 'UCL', fill: 'red', fontSize: 10 }} />
              <ReferenceLine y={lcl} stroke="red" strokeDasharray="3 3" label={{ value: 'LCL', fill: 'red', fontSize: 10 }} />
              <ReferenceLine y={mean} stroke="green" label={{ value: 'Mean', fill: 'green', fontSize: 10 }} />

              {/* Data Line */}
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#2563eb" 
                strokeWidth={2} 
                dot={{ r: 3, fill: "#2563eb" }} 
                activeDot={{ r: 6 }}
              />
              
              {/* Highlight Out of Control Points */}
              {/* This would ideally be a custom dot, but for simplicity we use the line */}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
