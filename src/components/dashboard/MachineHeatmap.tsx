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
      case 'running': return 'bg-green-500 text-white'
      case 'idle': return 'bg-amber-400 text-amber-950'
      case 'alarm': return 'bg-red-500 text-white'
      case 'offline': return 'bg-muted text-muted-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Machine Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
          {machineList.map((machine) => (
            <Link key={machine.id} to={`/machine/${machine.id}`}>
              <div
                className={cn(
                  "aspect-square rounded-lg flex flex-col items-center justify-center p-2",
                  "transition-all duration-200 ease-smooth cursor-pointer",
                  "hover:-translate-y-0.5 hover:shadow-card",
                  getStatusColor(machine.status)
                )}
                title={`${machine.name} - ${machine.status}`}
              >
                <div className="font-semibold text-lg">{machine.id.replace('M-', '')}</div>
                <div className="text-[10px] font-medium mt-1 capitalize">{machine.status}</div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
