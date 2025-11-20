import { useSelector } from 'react-redux'
import { type RootState } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, CheckCircle, Clock } from 'lucide-react'

export function OEETiles() {
  const machines = useSelector((state: RootState) => state.machines.machines)
  const machineList = Object.values(machines)
  
  const totalMachines = machineList.length
  const runningMachines = machineList.filter(m => m.status === 'running').length
  
  // Mock OEE Calculation (Average of random mock data)
  const availability = totalMachines > 0 ? (runningMachines / totalMachines) * 100 : 0
  const performance = 85 // Mock constant for now
  const quality = 98 // Mock constant for now
  const oee = (availability * performance * quality) / 10000

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overall OEE</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{(oee * 100).toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">Target: 85%</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Availability</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{availability.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">{runningMachines}/{totalMachines} Running</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Performance</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{performance}%</div>
          <p className="text-xs text-muted-foreground">Avg Cycle: 18.5s</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quality</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{quality}%</div>
          <p className="text-xs text-muted-foreground">Scrap Rate: 2%</p>
        </CardContent>
      </Card>
    </div>
  )
}
