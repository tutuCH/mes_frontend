/**
 * DragDropContext - Provides DragDropManager and drag state to children
 *
 * This context wraps the factory grid and provides:
 * - The DragDropManager singleton instance
 * - Current drag state (active machine, isDragging)
 * - Event handlers for drag lifecycle
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { DragDropManager } from '@dnd-kit/dom'
import type { Machine } from '@/types/api'
import { useDragDropManager } from '@/hooks/useDragDropManager'

interface DragDropContextValue {
  manager: DragDropManager
  activeMachine: Machine | null
  isDragging: boolean
  setActiveMachine: (machine: Machine | null) => void
}

const DragDropContext = createContext<DragDropContextValue | null>(null)

export function useDragDrop() {
  const context = useContext(DragDropContext)
  if (!context) {
    throw new Error('useDragDrop must be used within DragDropProvider')
  }
  return context
}

interface DragDropProviderProps {
  children: ReactNode
  onMachineMove?: (machineId: number, newRow: number, newCol: number) => void
}

export function DragDropProvider({ children, onMachineMove }: DragDropProviderProps) {
  const manager = useDragDropManager()
  const [activeMachine, setActiveMachine] = useState<Machine | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Set up drag event listeners
  useEffect(() => {
    const handleDragStart = () => {
      // Use rAF to ensure smooth animation start
      requestAnimationFrame(() => {
        setIsDragging(true)
      })
    }

    const handleDragEnd = (event: any) => {
      setIsDragging(false)
      setActiveMachine(null)

      if (!onMachineMove) return

      const { source, target, canceled } = event.operation || {}

      if (canceled || !target) return

      // Parse target ID to get grid coordinates
      const match = target.id.toString().match(/^cell-(\d+)-(\d+)$/)
      if (!match) return

      const machineId = source?.id
      if (typeof machineId === 'number') {
        onMachineMove(machineId, parseInt(match[1]), parseInt(match[2]))
      }
    }

    manager.monitor.addEventListener('dragstart', handleDragStart)
    manager.monitor.addEventListener('dragend', handleDragEnd)

    return () => {
      manager.monitor.removeEventListener('dragstart', handleDragStart)
      manager.monitor.removeEventListener('dragend', handleDragEnd)
    }
  }, [manager, onMachineMove])

  const value: DragDropContextValue = {
    manager,
    activeMachine,
    isDragging,
    setActiveMachine,
  }

  return <DragDropContext.Provider value={value}>{children}</DragDropContext.Provider>
}
