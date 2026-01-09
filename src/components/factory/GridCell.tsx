import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { getCellSizeClass, getCoordinate } from '@/utils/gridUtils'
import { EmptyGridCell } from './EmptyGridCell'
import { MachineStatusCard } from './MachineStatusCard'
import type { Machine } from '@/types/api'

interface GridCellProps {
  row: number
  col: number
  machine: Machine | null
  isConnected: boolean
  status?: string
  hasAlert?: boolean
  alertMessage?: string
  alertSeverity?: string
  lastUpdate?: string
  onCellClick: () => void
  onMachineDelete?: (_e: React.MouseEvent, machineId: number) => void
}

export function GridCell({
  row,
  col,
  machine,
  isConnected,
  status,
  hasAlert,
  alertMessage,
  alertSeverity,
  lastUpdate,
  onCellClick,
  onMachineDelete,
}: GridCellProps) {
  const coordinate = getCoordinate(row, col)
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${row}-${col}`,
    data: { row, col, coordinate },
  })

  if (machine) {
    return (
      <div className={cn(getCellSizeClass(), 'p-0.5')} ref={setNodeRef}>
        <MachineStatusCard
          machine={machine}
          isConnected={isConnected}
          status={status}
          hasAlert={hasAlert}
          alertMessage={alertMessage}
          alertSeverity={alertSeverity}
          lastUpdate={lastUpdate}
          onDelete={onMachineDelete ? (e) => onMachineDelete(e, machine.machineId) : undefined}
        />
      </div>
    )
  }

  return (
    <div className={cn(getCellSizeClass(), 'p-0.5')} ref={setNodeRef}>
      <EmptyGridCell
        row={row}
        col={col}
        coordinate={coordinate}
        onClick={onCellClick}
        isOver={isOver}
      />
    </div>
  )
}
