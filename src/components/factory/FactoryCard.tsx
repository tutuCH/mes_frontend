import { Card } from '@/components/ui/card'
import type { Factory, Machine } from '@/types/api'
import type { MachineState } from '@/types/machine'
import { FactoryHeader } from './FactoryHeader'
import { FactoryControlsBar } from './FactoryControlsBar'
import { BlueprintGrid } from './BlueprintGrid'
import { FactoryInstructionFooter } from './FactoryInstructionFooter'

interface FactoryCardProps {
  factory: Factory
  machines: Machine[]
  realtimeMachines?: Record<string, MachineState>
  onRefresh?: () => void
  onSettings?: () => void
  onDelete?: () => void
  onCellClick?: (row: number, col: number) => void
  onMachineMove?: (machineId: number, newRow: number, newCol: number) => void
}

export function FactoryCard({
  factory,
  machines,
  realtimeMachines,
  onRefresh,
  onSettings,
  onDelete,
  onCellClick,
  onMachineMove,
}: FactoryCardProps) {
  const machineCount = machines.length

  const handleCellClick = (row: number, col: number) => {
    if (onCellClick) {
      onCellClick(row, col)
    }
  }

  const handleMachineMove = (machineId: number, newRow: number, newCol: number) => {
    if (onMachineMove) {
      onMachineMove(machineId, newRow, newCol)
    }
  }

  return (
    <Card className="overflow-hidden border-2 border-gray-200 bg-transparent">
      {/* Header */}
      <FactoryHeader
        factory={factory}
        machineCount={machineCount}
        onDelete={machineCount === 0 ? onDelete : undefined}
      />

      {/* Controls Bar */}
      <FactoryControlsBar onRefresh={onRefresh} onSettings={onSettings} />

      {/* Blueprint Grid */}
      <BlueprintGrid
        factory={factory}
        machines={machines}
        realtimeMachines={realtimeMachines}
        onCellClick={handleCellClick}
        onMachineMove={handleMachineMove}
      />

      {/* Instruction Footer */}
      <div className="p-3 sm:p-4">
        <FactoryInstructionFooter />
      </div>
    </Card>
  )
}
