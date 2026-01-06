import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Mock data for zones
const zones = Array.from({ length: 16 }, (_, i) => ({
  id: `Z-${i + 1}`,
  temp: 220 + (Math.random() * 10 - 5),
  target: 220,
  status: Math.random() > 0.9 ? 'critical' : Math.random() > 0.7 ? 'warning' : 'normal'
}))

export function ZoneTemperatureGrid() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-status-red text-white'
      case 'warning': return 'bg-status-yellow text-white'
      default: return 'bg-secondary text-foreground'
    }
  }

  return (
    <Card className="muji-card shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium tracking-tight">Zone Temperatures</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
          {zones.map((zone) => (
            <div 
              key={zone.id}
              className={cn(
                "p-3 rounded-sm flex flex-col items-center justify-center transition-colors",
                getStatusColor(zone.status)
              )}
            >
              <div className="text-xs font-medium uppercase tracking-wider opacity-80">{zone.id}</div>
              <div className="text-xl font-mono font-bold my-1">{zone.temp.toFixed(1)}°</div>
              <div className="text-[10px] opacity-70">Target: {zone.target}°</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
