import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type MachineState } from '@/store/slices/machineSlice'
import { Thermometer, Clock, Activity, Droplets } from 'lucide-react'

interface NowPanelProps {
  machine: MachineState
}

export function NowPanel({ machine }: NowPanelProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Status</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold uppercase">{machine.status}</div>
          <p className="text-xs text-muted-foreground">Mode: {machine.opMode}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cycle Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{machine.cycleTime.toFixed(2)}s</div>
          <p className="text-xs text-muted-foreground">Count: {machine.cycleCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Barrel Temp</CardTitle>
          <Thermometer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{machine.temperature.toFixed(1)}°C</div>
          <p className="text-xs text-muted-foreground">Target: 230°C</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Oil Temp</CardTitle>
          <Droplets className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{machine.oilTemp.toFixed(1)}°C</div>
          <p className="text-xs text-muted-foreground">Normal Range</p>
        </CardContent>
      </Card>
    </div>
  )
}
