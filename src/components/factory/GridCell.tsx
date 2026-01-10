import { useDroppable, useDraggable } from '@dnd-kit/core'
import { useRef, useCallback } from 'react'
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

const DRAG_THRESHOLD = 8 // Distance in pixels to distinguish drag from click

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
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `cell-${row}-${col}`,
    data: { row, col, coordinate },
  })

  // Empty cell
  if (!machine) {
    return (
      <div className={cn(getCellSizeClass(), 'p-0.5')} ref={setDroppableRef}>
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

  // Machine cell (draggable)
  return <MachineCell machine={machine} row={row} col={col} isConnected={isConnected} status={status} hasAlert={hasAlert} alertMessage={alertMessage} alertSeverity={alertSeverity} lastUpdate={lastUpdate} onMachineDelete={onMachineDelete} setDroppableRef={setDroppableRef} />
}

interface MachineCellProps {
  machine: Machine
  row: number
  col: number
  isConnected: boolean
  status?: string
  hasAlert?: boolean
  alertMessage?: string
  alertSeverity?: string
  lastUpdate?: string
  onMachineDelete?: (_e: React.MouseEvent, machineId: number) => void
  setDroppableRef: (node: HTMLElement | null) => void
}

function MachineCell({
  machine,
  isConnected,
  status,
  hasAlert,
  alertMessage,
  alertSeverity,
  lastUpdate,
  onMachineDelete,
  setDroppableRef,
}: MachineCellProps) {
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)
  const combinedRef = useRef<HTMLElement | null>(null)

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: machine.machineId,
    data: { machine },
  })

  // Combine refs for both draggable and droppable
  const setCombinedRef = useCallback((node: HTMLElement | null) => {
    combinedRef.current = node
    setDraggableRef(node)
    setDroppableRef(node)
  }, [setDraggableRef, setDroppableRef])

  // Track pointer position to distinguish drag from click
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    listeners?.onPointerDown?.(e)
  }, [listeners])

  // Prevent navigation if a drag occurred
  const handleLinkClick = useCallback((e: React.MouseEvent) => {
    if (!dragStartPos.current) return

    const dx = e.clientX - dragStartPos.current.x
    const dy = e.clientY - dragStartPos.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > DRAG_THRESHOLD) {
      e.preventDefault()
    }
    dragStartPos.current = null
  }, [])

  return (
    <div
      className={cn(getCellSizeClass(), 'p-0.5')}
      ref={setCombinedRef}
      {...attributes}
      {...listeners}
      onPointerDown={handlePointerDown}
    >
      <MachineStatusCard
        machine={machine}
        isConnected={isConnected}
        isDragging={isDragging}
        onLinkClick={handleLinkClick}
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
