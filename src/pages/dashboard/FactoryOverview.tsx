import { useEffect, useState, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { type AppDispatch, type RootState } from '@/store'
import { fetchFactoriesWithMachines } from '@/store/slices/factorySlice'
import { api } from '@/services/api'
import { toast } from 'sonner'
import { WebSocketStatusPanel } from '@/components/factory/WebSocketStatusPanel'
import { FactorySelectorDropdown } from '@/components/factory/FactorySelectorDropdown'
import { FactoryCard } from '@/components/factory/FactoryCard'
import { MachineDialog } from '@/components/factory/MachineDialog'
import { FactoryDialog } from '@/components/factory/FactoryDialog'
import { getNumericIndex } from '@/utils/gridUtils'
import { useWebSocketStatus } from '@/hooks/useWebSocketStatus'
import type { Factory } from '@/types/api'

export default function FactoryOverview() {
  const { t } = useTranslation()
  const dispatch = useDispatch<AppDispatch>()
  const { factories, loading } = useSelector((state: RootState) => state.factories)
  // Subscribe to real-time machine data from Redux
  const machines = useSelector((state: RootState) => state.machines.machines)

  // Sync WebSocket status from socket service to Redux
  useWebSocketStatus()

  const [selectedFactoryId, setSelectedFactoryId] = useState<number | 'all'>('all')
  const [isMachineDialogOpen, setIsMachineDialogOpen] = useState(false)
  const [isFactoryDialogOpen, setIsFactoryDialogOpen] = useState(false)
  const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null)
  const [selectedCellCoordinate, setSelectedCellCoordinate] = useState<string>('')

  // Fetch factories on mount
  useEffect(() => {
    dispatch(fetchFactoriesWithMachines())
  }, [dispatch])

  // Filter factories based on selection
  const filteredFactories = factories.filter((factory) => {
    if (selectedFactoryId === 'all') return true
    return factory.factoryId === selectedFactoryId
  })

  // Handle cell click (add machine)
  const handleCellClick = useCallback((row: number, col: number) => {
    // Find the factory that was clicked
    const factory = filteredFactories[0] // Only works when viewing a single factory
    if (!factory) return

    setSelectedCellCoordinate(getNumericIndex(row, col, factory.factoryWidth))
    setSelectedFactory(factory)
    setIsMachineDialogOpen(true)
  }, [filteredFactories])

  // Handle machine move
  const handleMachineMove = async (machineId: number, newRow: number, newCol: number) => {
    try {
      // Need to find the factory width to calculate the numeric index
      const factory = filteredFactories[0]
      if (!factory) return

      const newIndex = getNumericIndex(newRow, newCol, factory.factoryWidth)
      await api.updateMachine(machineId, { machineIndex: newIndex })
      dispatch(fetchFactoriesWithMachines())
      toast.success('Machine moved successfully')
    } catch (error) {
      console.error('Failed to move machine:', error)
      toast.error('Failed to move machine')
    }
  }

  // Handle factory delete
  const handleFactoryDelete = async (factory: Factory) => {
    try {
      await api.deleteFactory(factory.factoryId)
      dispatch(fetchFactoriesWithMachines())
      toast.success('Factory deleted successfully')
    } catch (error) {
      console.error('Failed to delete factory:', error)
      toast.error('Failed to delete factory')
    }
  }

  // Handle refresh
  const handleRefresh = () => {
    dispatch(fetchFactoriesWithMachines())
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('factoryView.title')}</h1>
        {selectedFactoryId === 'all' && (
          <Button onClick={() => {
            // Create a default factory object for the dialog
            setSelectedFactory({
              factoryId: 0, // 0 indicates create mode
              factoryName: '',
              factoryIndex: '0',
              factoryWidth: 10,
              factoryHeight: 10,
              createdAt: new Date().toISOString(),
            })
            setIsFactoryDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('factory.addFactory')}
          </Button>
        )}
      </div>

      {/* WebSocket Status Panel */}
      <WebSocketStatusPanel />

      {/* Factory Selector */}
      {factories.length > 1 && (
        <div className="flex justify-end">
          <FactorySelectorDropdown
            factories={factories}
            selectedFactoryId={selectedFactoryId}
            onChange={setSelectedFactoryId}
          />
        </div>
      )}

      {/* Factory Cards */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('common.loading')}
        </div>
      ) : filteredFactories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('factory.noFactories')}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredFactories.map((factory) => (
            <FactoryCard
              key={factory.factoryId}
              factory={factory}
              machines={factory.machines || []}
              realtimeMachines={machines}
              onRefresh={handleRefresh}
              onSettings={() => {
                setSelectedFactory(factory)
                setIsFactoryDialogOpen(true)
              }}
              onDelete={
                (factory.machines?.length || 0) === 0
                  ? () => handleFactoryDelete(factory)
                  : undefined
              }
              onCellClick={selectedFactoryId !== 'all' ? handleCellClick : undefined}
              onMachineMove={handleMachineMove}
            />
          ))}
        </div>
      )}

      {/* Machine Dialog */}
      {selectedFactory && (
        <MachineDialog
          open={isMachineDialogOpen}
          onOpenChange={setIsMachineDialogOpen}
          factory={selectedFactory}
          coordinate={selectedCellCoordinate}
          onSave={() => dispatch(fetchFactoriesWithMachines())}
        />
      )}

      {/* Factory Dialog */}
      {selectedFactory && (
        <FactoryDialog
          open={isFactoryDialogOpen}
          onOpenChange={setIsFactoryDialogOpen}
          factory={selectedFactory}
          onSave={() => dispatch(fetchFactoriesWithMachines())}
        />
      )}
    </div>
  )
}
