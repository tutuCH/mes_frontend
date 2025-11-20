import { useRealtimeData } from '@/hooks/useRealtimeData'
import { MachineHeatmap } from '@/components/dashboard/MachineHeatmap'
import { OEETiles } from '@/components/dashboard/OEETiles'
import { DowntimePareto } from '@/components/dashboard/DowntimePareto'

export default function FactoryOverview() {
  useRealtimeData()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Factory Overview</h1>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <OEETiles />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <MachineHeatmap />
        </div>
        <div className="col-span-3">
          <DowntimePareto />
        </div>
      </div>
    </div>
  )
}
