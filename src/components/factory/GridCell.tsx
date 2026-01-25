import { useRef, useEffect } from 'react'
import { Droppable, Draggable } from '@dnd-kit/dom'
import { cn } from '@/lib/utils'
import { getCellSizeClass, getCoordinate } from '@/utils/gridUtils'
import { EmptyGridCell } from './EmptyGridCell'
import { MachineStatusCard } from './MachineStatusCard'
import type { Machine } from '@/types/api'
import { useDragDrop } from '@/context/DragDropContext'

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
  selectionMode?: boolean
  selectedPosition?: { row: number; col: number } | null
  disableDragDrop?: boolean
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
  selectionMode = false,
  selectedPosition = null,
  disableDragDrop = false,
}: GridCellProps) {
  const coordinate = getCoordinate(row, col)
  const { manager, setActiveMachine } = useDragDrop()

  const cellRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLElement>(null)
  const droppableRef = useRef<Droppable | null>(null)
  const draggableRef = useRef<Draggable | null>(null)

  // Register as droppable on mount
  useEffect(() => {
    if (!cellRef.current) return

    const droppable = new Droppable(
      {
        id: `cell-${row}-${col}`,
        element: cellRef.current,
        data: { row, col, coordinate },
      },
      manager
    )

    droppableRef.current = droppable

    return () => {
      droppable.unregister()
      droppableRef.current = null
    }
  }, [manager, row, col, coordinate])

  // Check if this cell is selected
  const isSelected =
    selectionMode &&
    selectedPosition &&
    selectedPosition.row === row &&
    selectedPosition.col === col

  // Empty cell
  if (!machine) {
    return (
      <div className={cn(getCellSizeClass(), 'p-0.5')} ref={cellRef}>
        <EmptyGridCell
          row={row}
          col={col}
          coordinate={coordinate}
          onClick={onCellClick}
          isOver={false}
          selectionMode={selectionMode}
          isSelected={!!isSelected}
        />
      </div>
    )
  }

  // Machine cell (draggable with handle, unless disabled)
  useEffect(() => {
    if (disableDragDrop || !cellRef.current || !handleRef.current) return

    const draggable = new Draggable(
      {
        id: machine.machineId,
        element: cellRef.current,
        handle: handleRef.current,
        feedback: 'clone',
        data: { machine },
      },
      manager
    )

    draggableRef.current = draggable

    // Set active machine on drag start
    const handleDragStart = () => {
      setActiveMachine(machine)
    }

    manager.monitor.addEventListener('dragstart', handleDragStart)

    return () => {
      manager.monitor.removeEventListener('dragstart', handleDragStart)
      draggable.unregister()
      draggableRef.current = null
    }
  }, [manager, machine, setActiveMachine, disableDragDrop])

  return (
    <div
      className={cn(
        getCellSizeClass(),
        'p-0.5',
        selectionMode && 'opacity-70 cursor-not-allowed'
      )}
      ref={cellRef}
    >
      <MachineStatusCard
        machine={machine}
        isConnected={isConnected}
        status={status}
        hasAlert={hasAlert}
        alertMessage={alertMessage}
        alertSeverity={alertSeverity}
        lastUpdate={lastUpdate}
        onHandleRef={!disableDragDrop ? (element) => {
          handleRef.current = element
        } : undefined}
        onDelete={onMachineDelete ? (e) => onMachineDelete(e, machine.machineId) : undefined}
      />
    </div>
  )
}
