import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { type RootState } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function MachineHeatmap() {
  const machines = useSelector((state: RootState) => state.machines.machines)
  const machineList = Object.values(machines).sort((a, b) => a.id.localeCompare(b.id))

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-status-green text-white'
      case 'idle': return 'bg-status-yellow text-white'
      case 'alarm': return 'bg-status-red text-white'
      case 'offline': return 'bg-secondary text-muted-foreground'
      default: return 'bg-secondary text-muted-foreground'
    }
  }

  return (
    <Card className="muji-card shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium tracking-tight">Machine Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {machineList.map((machine) => (
            <Link key={machine.id} to={`/machine/${machine.id}`}>
              <div
                className={cn(
                  "aspect-square rounded-sm flex flex-col items-center justify-center p-2 transition-colors hover:opacity-90 cursor-pointer",
                  getStatusColor(machine.status)
                )}
                title={`${machine.name} - ${machine.status}`}
              >
                <div className="font-bold text-lg font-mono">{machine.id.replace('M-', '')}</div>
                <div className="text-[10px] uppercase tracking-wider font-medium mt-1">{machine.status}</div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
