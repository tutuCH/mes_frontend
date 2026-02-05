import { useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '@/store'
import {
  fetchMaterials,
  fetchInventoryLots,
  fetchMaterialAssignments,
  fetchInventorySummary,
  fetchInventoryTrend,
} from '@/store/slices/inventorySlice'
import type {
  Material,
  InventoryLot,
  MaterialAssignment,
  MaterialSummary,
  InventoryTrendPoint,
} from '@/types/api'

export interface UseInventoryStateReturn {
  materials: Material[]
  lots: InventoryLot[]
  assignments: MaterialAssignment[]
  summary: MaterialSummary[]
  inventoryTrend: InventoryTrendPoint[]
  loading: {
    materials: boolean
    lots: boolean
    assignments: boolean
    summary: boolean
    trend: boolean
  }
  error: string | null
  refetchAll: () => void
  refetchSummary: () => void
}

export function useInventoryState(): UseInventoryStateReturn {
  const dispatch = useDispatch<AppDispatch>()
  const { materials, lots, assignments, summary, inventoryTrend, loading, error } = useSelector(
    (state: RootState) => state.inventory
  )

  useEffect(() => {
    dispatch(fetchMaterials())
    dispatch(fetchInventoryLots())
    dispatch(fetchMaterialAssignments())
    dispatch(fetchInventorySummary())
    dispatch(fetchInventoryTrend())
  }, [dispatch])

  const refetchAll = useCallback(() => {
    dispatch(fetchMaterials())
    dispatch(fetchInventoryLots())
    dispatch(fetchMaterialAssignments())
    dispatch(fetchInventorySummary())
    dispatch(fetchInventoryTrend())
  }, [dispatch])

  const refetchSummary = useCallback(() => {
    dispatch(fetchInventorySummary())
  }, [dispatch])

  const loadingState = useMemo(() => {
    return {
      materials: loading.materials,
      lots: loading.lots,
      assignments: loading.assignments,
      summary: loading.summary,
      trend: loading.trend,
    }
  }, [loading])

  return {
    materials,
    lots,
    assignments,
    summary,
    inventoryTrend,
    loading: loadingState,
    error,
    refetchAll,
    refetchSummary,
  }
}
