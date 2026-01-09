import { useSelector } from 'react-redux'
import { type RootState } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, CheckCircle, Clock, Circle, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OEETiles() {
  const machines = useSelector((state: RootState) => state.machines.machines)
  const machineList = Object.values(machines)

  const totalMachines = machineList.length
  const runningMachines = machineList.filter(m => m.status === 'running').length

  // Availability: percentage of machines in running status
  const availability = totalMachines > 0 ? (runningMachines / totalMachines) * 100 : 0

  // Performance: average efficiency across all running machines
  const runningMachineList = machineList.filter(m => m.status === 'running' && m.efficiency > 0)
  const avgPerformance = runningMachineList.length > 0
    ? runningMachineList.reduce((sum, m) => sum + m.efficiency, 0) / runningMachineList.length
    : 0

  // Quality: For now, use a placeholder. In production, this would come from
  // quality data (good parts / total parts). We'll estimate it from machine status.
  const machinesWithoutAlerts = machineList.filter(m => !m.hasAlert).length
  const quality = totalMachines > 0 ? (machinesWithoutAlerts / totalMachines) * 100 : 0

  // OEE = Availability × Performance × Quality / 10000
  const oee = (availability * avgPerformance * quality) / 10000

  const getStatusColor = (value: number) => {
    if (value >= 85) return 'text-green-500'
    if (value >= 70) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {/* Availability */}
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

      {/* Performance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Performance</CardTitle>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Circle className={cn("h-2 w-2 fill-current", getStatusColor(avgPerformance))} />
            <div className="text-2xl font-semibold">{avgPerformance.toFixed(1)}%</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Avg Efficiency</p>
        </CardContent>
      </Card>

      {/* Quality */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quality</CardTitle>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Circle className={cn("h-2 w-2 fill-current", getStatusColor(quality))} />
            <div className="text-2xl font-semibold">{quality.toFixed(1)}%</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{machinesWithoutAlerts}/{totalMachines} Healthy</p>
        </CardContent>
      </Card>

      {/* OEE */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">OEE</CardTitle>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Circle className={cn("h-2 w-2 fill-current", getStatusColor(oee))} />
            <div className="text-2xl font-semibold">{oee.toFixed(1)}%</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Overall Equipment Effectiveness</p>
        </CardContent>
      </Card>
    </div>
  )
}
