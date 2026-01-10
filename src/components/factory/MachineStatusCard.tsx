import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { X, AlertTriangle, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStatusColor, getStatusIcon } from '@/utils/gridUtils'
import type { Machine } from '@/types/api'

interface MachineStatusCardProps {
  machine: Machine
  isConnected: boolean
  isDragging?: boolean
  onLinkClick?: (e: React.MouseEvent) => void
  onDelete?: (e: React.MouseEvent) => void
  onHandleRef?: (element: HTMLElement | null) => void
  // Real-time data props
  status?: string
  hasAlert?: boolean
  alertMessage?: string
  alertSeverity?: string
  lastUpdate?: string
}

export function MachineStatusCard({
  machine,
  isConnected,
  isDragging = false,
  onLinkClick,
  onDelete,
  onHandleRef,
  status: realtimeStatus,
  hasAlert,
  alertMessage,
  alertSeverity,
  lastUpdate,
}: MachineStatusCardProps) {
  // When connected via WebSocket, show as running regardless of actual status
  const effectiveStatus = isConnected ? 'running' : (realtimeStatus || machine.status || 'offline')
  const statusConfig = getStatusColor(effectiveStatus)
  const StatusIcon = getStatusIcon(effectiveStatus)

  // Format relative time (e.g., "2m ago", "just now")
  const formatRelativeTime = (timestamp?: string): string => {
    if (!timestamp) return ''
    const now = Date.now()
    const time = new Date(timestamp).getTime()
    const diff = Math.floor((now - time) / 1000) // seconds

    if (diff < 10) return 'now'
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  return (
    <Link
      to={`/machine/${machine.machineId}`}
      onClick={onLinkClick}
      className={cn(
        'w-full h-full',
        'flex flex-col items-center justify-center',
        'p-1 sm:p-2',
        'border border-dashed',
        'rounded-md',
        'transition-all duration-200 ease-out',
        'hover:shadow-md hover:-translate-y-0.5',
        'relative group',
        statusConfig.border,
        isDragging && 'opacity-50',
        'bg-gradient-to-br ' + statusConfig.background
      )}
      aria-label={`${machine.machineName}, status ${effectiveStatus}`}
      title={`${machine.machineName} - ${effectiveStatus}`}
    >
      {/* Drag handle - top left corner */}
      <div
        ref={onHandleRef}
        className={cn(
          'absolute top-0 left-0 p-0.5 sm:p-1',
          'cursor-grab active:cursor-grabbing',
          'opacity-0 group-hover:opacity-100',
          'transition-opacity duration-200',
          'hover:bg-black/5 rounded-tl-xl',
          'z-10'
        )}
        aria-label="Drag to move"
        title="Drag to move"
      >
        <GripVertical className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground/50" />
      </div>

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

      {/* Alert badge */}
      {hasAlert && (
        <div className="absolute top-0.5 right-0.5" title={alertMessage || 'Active alert'}>
          <AlertTriangle
            className={cn(
              'h-3 w-3 animate-pulse',
              alertSeverity === 'critical' ? 'text-red-500' :
              alertSeverity === 'warning' ? 'text-yellow-500' :
              'text-blue-500'
            )}
          />
        </div>
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

        {/* Last update timestamp */}
        {lastUpdate && isConnected && (
          <div className="text-[7px] sm:text-[8px] text-muted-foreground/70 mt-0.5">
            {formatRelativeTime(lastUpdate)}
          </div>
        )}
      </div>
    </Link>
  )
}
