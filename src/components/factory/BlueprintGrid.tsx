import { useMemo, useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ColumnHeaders } from './ColumnHeaders'
import { RowHeaders } from './RowHeaders'
import { GridCell } from './GridCell'
import type { Factory, Machine } from '@/types/api'
import type { MachineState } from '@/types/machine'
import { cn } from '@/lib/utils'
import { useSelector } from 'react-redux'
import { type RootState } from '@/store'

interface BlueprintGridProps {
  factory: Factory
  machines: Machine[]
  realtimeMachines?: Record<string, MachineState>
  onCellClick: (row: number, col: number) => void
  onMachineMove?: (machineId: number, newRow: number, newCol: number) => void
}

export function BlueprintGrid({ factory, machines, realtimeMachines, onCellClick, onMachineMove }: BlueprintGridProps) {
  const gridWidth = factory.factoryWidth || 10
  const gridHeight = factory.factoryHeight || 10

  // Get subscribed machines to determine connection status
  const subscribedMachines = useSelector((state: RootState) => state.factories.subscribedMachines)

  // Helper to merge static machine data with real-time data
  const getMachineWithRealtimeData = useCallback((machine: Machine): Partial<MachineState> & { machine: Machine } => {
    const realtime = realtimeMachines?.[machine.machineId.toString()]
    return {
      machine,
      // Real-time data overrides
      ...realtime,
      // Always use the machine object as base
      id: machine.machineId.toString(),
      deviceId: realtime?.deviceId || machine.machineName,
      name: realtime?.name || machine.machineName,
      temperature: realtime?.temperature ?? 0,
      oilTemp: realtime?.oilTemp ?? 0,
      status: realtime?.status || machine.status,
      opMode: realtime?.opMode || 'manual',
      cycleTime: realtime?.cycleTime ?? 0,
      efficiency: realtime?.efficiency ?? 0,
      lastUpdate: realtime?.lastUpdate || new Date().toISOString(),
      hasAlert: realtime?.hasAlert || false,
      alertMessage: realtime?.alertMessage,
      alertSeverity: realtime?.alertSeverity,
    }
  }, [realtimeMachines])

  // Create a map of machine positions
  const machinePositions = useMemo(() => {
    const positions = new Map<string, Machine>()
    machines.forEach((machine) => {
      try {
        // machineIndex is a number (stored as string): 0, 1, 2...
        // Convert to row/col: left-to-right, top-to-bottom
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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const [activeMachine, setActiveMachine] = useState<Machine | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const machine = machines.find((m) => m.machineId === active.id)
    if (machine) {
      setActiveMachine(machine)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveMachine(null)

    if (!over || !onMachineMove) return

    const match = over.id.toString().match(/^cell-(\d+)-(\d+)$/)
    if (!match) return

    const [, rowStr, colStr] = match
    const newRow = parseInt(rowStr)
    const newCol = parseInt(colStr)

    const machineId = active.id as number
    onMachineMove(machineId, newRow, newCol)
  }

  // Generate grid cells
  const gridCells = useMemo(() => {
    const cells = []
    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        const key = `${row}-${col}`
        const machine = machinePositions.get(key)
        // Check if machine is subscribed to WebSocket (not just if it exists in Redux)
        const isConnected = machine ? subscribedMachines.includes(machine.machineName) : false

        // Merge with real-time data if available
        const machineData = machine ? getMachineWithRealtimeData(machine) : null

        cells.push({
          row,
          col,
          machine: machine || null,
          isConnected,
          // Pass real-time data to GridCell
          status: machineData?.status,
          hasAlert: machineData?.hasAlert || false,
          alertMessage: machineData?.alertMessage,
          alertSeverity: machineData?.alertSeverity,
          lastUpdate: machineData?.lastUpdate,
        })
      }
    }
    return cells
  }, [gridWidth, gridHeight, machinePositions, subscribedMachines, machines, getMachineWithRealtimeData])

  return (
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

          {/* Column headers */}
          <ColumnHeaders width={gridWidth} />

          {/* Row + Grid */}
          <div className="flex">
            <RowHeaders height={gridHeight} />

            {/* Grid area */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div
                className={cn(
                  'grid gap-1 rounded-md p-1 sm:p-2 shadow-sm',
                  onMachineMove && 'cursor-move'
                )}
                style={{
                  gridTemplateColumns: `repeat(${gridWidth}, minmax(4rem, 6rem))`,
                  gridTemplateRows: `repeat(${gridHeight}, auto)`,
                }}
              >
                {gridCells.map(({ row, col, machine, isConnected, status, hasAlert, alertMessage, alertSeverity, lastUpdate }) => (
                  <GridCell
                    key={`${row}-${col}`}
                    row={row}
                    col={col}
                    machine={machine}
                    isConnected={isConnected}
                    status={status}
                    hasAlert={hasAlert}
                    alertMessage={alertMessage}
                    alertSeverity={alertSeverity}
                    lastUpdate={lastUpdate}
                    onCellClick={() => onCellClick(row, col)}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeMachine && (
                  <div className="w-20 h-20 opacity-50 scale-110">
                    <div className="w-full h-full bg-blue-100 rounded-lg border-2 border-blue-300 flex items-center justify-center">
                      <span className="text-xs font-medium">{activeMachine.machineName}</span>
                    </div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
