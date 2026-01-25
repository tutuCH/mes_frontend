import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ColumnHeaders } from './ColumnHeaders'
import { RowHeaders } from './RowHeaders'
import { GridCell } from './GridCell'
import { MachineStatusCard } from './MachineStatusCard'
import type { Factory, Machine } from '@/types/api'
import type { MachineState } from '@/types/machine'
import { useSelector } from 'react-redux'
import { type RootState } from '@/store'
import { DragDropProvider, useDragDrop } from '@/context/DragDropContext'

interface BlueprintGridProps {
  factory: Factory
  machines: Machine[]
  realtimeMachines?: Record<string, MachineState>
  onCellClick: (row: number, col: number) => void
  onMachineMove?: (machineId: number, newRow: number, newCol: number) => void
  selectionMode?: boolean
  selectedPosition?: { row: number; col: number } | null
  disableDragDrop?: boolean
}

interface MachineCellData {
  row: number
  col: number
  machine: Machine | null
  isConnected: boolean
  status?: string
  hasAlert: boolean
  alertMessage?: string
  alertSeverity?: string
  lastUpdate?: string
}

function BlueprintGridContent({
  factory,
  machines,
  realtimeMachines,
  onCellClick,
  selectionMode = false,
  selectedPosition = null,
  disableDragDrop = false,
}: Omit<BlueprintGridProps, 'onMachineMove'>) {
  const gridWidth = factory.factoryWidth || 10
  const gridHeight = factory.factoryHeight || 10

  const subscribedMachines = useSelector((state: RootState) => state.factories.subscribedMachines)
  const { activeMachine, isDragging } = useDragDrop()

  // Map of machine positions by grid coordinate
  const machinePositions = useMemo(() => {
    const positions = new Map<string, Machine>()
    machines.forEach((machine) => {
      try {
        const index = parseInt(machine.machineIndex, 10)
        if (!isNaN(index) && index >= 0) {
          const row = Math.floor(index / gridWidth)
          const col = index % gridWidth
          positions.set(`${row}-${col}`, machine)
        }
      } catch (error) {
        console.error(`Invalid machine index: ${machine.machineIndex}`, error)
      }
    })
    return positions
  }, [machines, gridWidth])

  // Generate grid cells with real-time data
  const gridCells = useMemo(() => {
    const cells: MachineCellData[] = []
    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        const machine = machinePositions.get(`${row}-${col}`)
        const realtime = realtimeMachines?.[machine?.machineId.toString() ?? '']

        cells.push({
          row,
          col,
          machine: machine ?? null,
          isConnected: machine ? subscribedMachines.includes(machine.machineName) : false,
          status: realtime?.status || machine?.status,
          hasAlert: realtime?.hasAlert || false,
          alertMessage: realtime?.alertMessage,
          alertSeverity: realtime?.alertSeverity,
          lastUpdate: realtime?.lastUpdate,
        })
      }
    }
    return cells
  }, [gridWidth, gridHeight, machinePositions, realtimeMachines, subscribedMachines, machines])

  // Prepare drag overlay content
  const dragOverlay = activeMachine ? (
    <div className="scale-105 cursor-grabbing" style={{ width: '6rem', height: '5rem' }}>
      <MachineStatusCard
        machine={activeMachine}
        isConnected={subscribedMachines.includes(activeMachine.machineName)}
        isDragging={true}
        status={realtimeMachines?.[activeMachine.machineId.toString()]?.status || activeMachine.status}
        hasAlert={realtimeMachines?.[activeMachine.machineId.toString()]?.hasAlert || false}
        alertMessage={realtimeMachines?.[activeMachine.machineId.toString()]?.alertMessage}
        alertSeverity={realtimeMachines?.[activeMachine.machineId.toString()]?.alertSeverity}
        lastUpdate={realtimeMachines?.[activeMachine.machineId.toString()]?.lastUpdate}
      />
    </div>
  ) : null

  return (
    <>
      <ScrollArea className="w-full rounded-md border">
        <div className="p-2 sm:p-4">
          <div className="relative">
            {/* Blueprint background pattern */}
            <div
              className="absolute inset-0 pointer-events-none -z-10 bg-blue-50"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
              }}
            />

            <ColumnHeaders width={gridWidth} />

            <div className="flex">
              <RowHeaders height={gridHeight} />

              <div
                className="grid gap-1 rounded-md p-1 sm:p-2 shadow-sm"
                style={{
                  gridTemplateColumns: `repeat(${gridWidth}, minmax(4rem, 6rem))`,
                  gridTemplateRows: `repeat(${gridHeight}, auto)`,
                }}
              >
                {gridCells.map((cell) => (
                  <GridCell
                    key={`${cell.row}-${cell.col}`}
                    row={cell.row}
                    col={cell.col}
                    machine={cell.machine}
                    isConnected={cell.isConnected}
                    status={cell.status}
                    hasAlert={cell.hasAlert}
                    alertMessage={cell.alertMessage}
                    alertSeverity={cell.alertSeverity}
                    lastUpdate={cell.lastUpdate}
                    onCellClick={() => onCellClick(cell.row, cell.col)}
                    selectionMode={selectionMode}
                    selectedPosition={selectedPosition}
                    disableDragDrop={disableDragDrop}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Drag overlay - rendered at document body level for proper positioning */}
      {isDragging && dragOverlay && createPortal(dragOverlay, document.body)}
    </>
  )
}

export function BlueprintGrid(props: BlueprintGridProps) {
  return (
    <DragDropProvider onMachineMove={props.onMachineMove}>
      <BlueprintGridContent {...props} />
    </DragDropProvider>
  )
}
