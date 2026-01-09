import { useSelector } from 'react-redux'
import { type RootState } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, CheckCircle, Clock, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OEETiles() {
  const machines = useSelector((state: RootState) => state.machines.machines)
  const machineList = Object.values(machines)

  const totalMachines = machineList.length
  const runningMachines = machineList.filter(m => m.status === 'running').length

  // Availability is calculated from real machine status data
  const availability = totalMachines > 0 ? (runningMachines / totalMachines) * 100 : 0

  const getStatusColor = (value: number) => {
    if (value >= 85) return 'text-green-500'
    if (value >= 70) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {/* Availability - Real data from machine status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Availability</CardTitle>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Circle className={cn("h-2 w-2 fill-current", getStatusColor(availability))} />
            <div className="text-2xl font-semibold">{availability.toFixed(1)}%</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{runningMachines}/{totalMachines} Running</p>
        </CardContent>
      </Card>
    </div>
  )
}
