import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type MachineState } from '@/types/machine'
import { Thermometer, Clock, Activity, Droplets, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NowPanelProps {
  machine: MachineState
}

export function NowPanel({ machine }: NowPanelProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-500'
      case 'idle': return 'text-amber-500'
      case 'alarm': return 'text-red-500'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Status</CardTitle>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Circle className={cn("h-2 w-2 fill-current", getStatusColor(machine.status))} />
            <div className="text-2xl font-semibold capitalize">{machine.status}</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Mode: {machine.opMode}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cycle Time</CardTitle>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{machine.cycleTime.toFixed(2)}s</div>
          <p className="text-xs text-muted-foreground mt-1">Count: {machine.cycleCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Barrel Temp</CardTitle>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Thermometer className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{machine.temperature.toFixed(1)}°C</div>
          <p className="text-xs text-muted-foreground mt-1">Target: 230°C</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Oil Temp</CardTitle>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Droplets className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{machine.oilTemp.toFixed(1)}°C</div>
          <p className="text-xs text-muted-foreground mt-1">Normal Range</p>
        </CardContent>
      </Card>
    </div>
  )
}
