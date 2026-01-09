import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStatusColor, getStatusIcon } from '@/utils/gridUtils'
import type { Machine } from '@/types/api'

interface MachineStatusCardProps {
  machine: Machine
  isConnected: boolean
  isDragging?: boolean
  onDelete?: (e: React.MouseEvent) => void
}

export function MachineStatusCard({
  machine,
  isConnected,
  isDragging = false,
  onDelete,
}: MachineStatusCardProps) {
  const status = machine.status || 'offline'
  const statusConfig = getStatusColor(status)
  const StatusIcon = getStatusIcon(status)

  return (
    <Link
      to={`/machine/${machine.machineId}`}
      className={cn(
        'w-full h-full',
        'flex flex-col items-center justify-center',
        'p-1 sm:p-2',
        'border border-dashed',
        'rounded-xl',
        'transition-all duration-200 ease-out',
        'hover:shadow-md hover:-translate-y-0.5',
        'relative group',
        statusConfig.border,
        isDragging && 'opacity-50',
        'bg-gradient-to-br ' + statusConfig.background
      )}
      aria-label={`${machine.machineName}, status ${status}`}
      title={`${machine.machineName} - ${status}`}
    >
      {/* Delete button (appears on hover) */}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 h-4 w-4 sm:h-5 sm:w-5 rounded-full hover:bg-black/10 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onDelete}
        >
          <X className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
        </Button>
      )}

      {/* Pulsing indicator for connected machines */}
      {isConnected && (
        <span className="absolute top-1 left-1 animate-pulse h-2 w-2 rounded-full bg-current" style={{ color: `hsl(var(--${statusConfig.dot.replace('bg-', '')}))` }} />
      )}

      <div className="flex flex-col items-center justify-center w-full h-full">
        {/* Status icon */}
        <div className="text-center mb-0.5 sm:mb-1">
          <StatusIcon className={cn('h-4 w-4 sm:h-5 sm:w-5', statusConfig.icon)} />
        </div>

        {/* Machine name */}
        <span className="font-medium text-center text-[10px] sm:text-xs leading-tight max-w-full truncate px-1 text-foreground">
          {machine.machineName}
        </span>
      </div>
    </Link>
  )
}
