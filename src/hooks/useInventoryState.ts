import { useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '@/store'
import {
  fetchMaterials,
  fetchInventoryLots,
  fetchMaterialAssignments,
  fetchInventorySummary,
} from '@/store/slices/inventorySlice'
import type { Material, InventoryLot, MaterialAssignment, MaterialSummary } from '@/types/api'

export interface UseInventoryStateReturn {
  materials: Material[]
  lots: InventoryLot[]
  assignments: MaterialAssignment[]
  summary: MaterialSummary[]
  loading: {
    materials: boolean
    lots: boolean
    assignments: boolean
    summary: boolean
  }
  error: string | null
  refetchAll: () => void
  refetchSummary: () => void
}

export function useInventoryState(): UseInventoryStateReturn {
  const dispatch = useDispatch<AppDispatch>()
  const { materials, lots, assignments, summary, loading, error } = useSelector(
    (state: RootState) => state.inventory
  )

  useEffect(() => {
    dispatch(fetchMaterials())
    dispatch(fetchInventoryLots())
    dispatch(fetchMaterialAssignments())
    dispatch(fetchInventorySummary())
  }, [dispatch])

  const refetchAll = useCallback(() => {
    dispatch(fetchMaterials())
    dispatch(fetchInventoryLots())
    dispatch(fetchMaterialAssignments())
    dispatch(fetchInventorySummary())
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
    }
  }, [loading])

  return {
    materials,
    lots,
    assignments,
    summary,
    loading: loadingState,
    error,
    refetchAll,
    refetchSummary,
  }
}
