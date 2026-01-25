import { useState, useEffect, useMemo, useCallback, useRef, startTransition } from 'react'
import { useSelector } from 'react-redux'
import { MetricCategorySection } from '@/components/spc/MetricCategorySection'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Download, Calendar, RefreshCcw, ChevronDown, ChevronUp, Loader2, Play, Pause } from 'lucide-react'
import { type RootState } from '@/store'
import { api } from '@/services/api'
import { socketService } from '@/services/socket'
import { formatLocaleTime, formatLocaleString } from '@/utils/dateUtils'
import { exportSPCDataToExcel } from '@/utils/exportExcel'
import { normalizeRealtimeData, normalizeSPCData } from '@/utils/fieldMapping'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { RealtimeUpdateEvent, SPCUpdateEvent } from '@/types/api'
import { useTranslation } from 'react-i18next'

type TimeRange = 'last15m' | 'last1h' | 'last6h' | 'last24Hours' | 'last3d' | 'last7d'

// Map TimeRange to TimeWindow format for SPC charts
const TIME_RANGE_TO_WINDOW: Record<TimeRange, string> = {
  last15m: 'last_15m',
  last1h: 'last_1h',
  last6h: 'last_6h',
  last24Hours: 'last_24h',
  last3d: 'last_3d',
  last7d: 'last_7d'
}

export default function SPCAnalysis() {
  const { t } = useTranslation()
  const machines = useSelector((state: RootState) => state.machines.machines)
  const machineList = Object.values(machines).sort((a, b) => a.id.localeCompare(b.id))

  const [selectedMachineId, setSelectedMachineId] = useState<string>('')
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('last24Hours')

  // Chart data - fetched once with higher limit for SPC analysis charts
  const [chartSpcHistory, setChartSpcHistory] = useState<any[]>([])

  // Table data - paginated data for Raw Data Logs tables
  const [spcHistory, setSpcHistory] = useState<any[]>([])
  const [realtimeHistory, setRealtimeHistory] = useState<any[]>([])

  // Pagination metadata from API
  const [spcPagination, setSpcPagination] = useState({ total: 0, limit: 10, offset: 0 })
  const [realtimePagination, setRealtimePagination] = useState({ total: 0, limit: 10, offset: 0 })

  const [loading, setLoading] = useState(false)
  const [tableLoading, setTableLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [rawDataLogsOpen, setRawDataLogsOpen] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState('tech')
  const rowsPerPage = 10
  const [lastDataUpdate, setLastDataUpdate] = useState<Date | undefined>(undefined)
  const [isSubscribed, setIsSubscribed] = useState(false)

  // Pause/resume real-time updates
  const [isPaused, setIsPaused] = useState(false)

  // ========== VISIBILITY-DRIVEN RECOMPUTE (Task 4) ==========
  // Track which metric categories are expanded
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['Cycle', 'Injection', 'Pack/Hold', 'Plasticizing'])) // All except Temperature by default

  const toggleCategoryOpen = useCallback((category: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  const isCategoryOpen = useCallback((category: string) => openCategories.has(category), [openCategories])
  // ==========================================================

  // ========== BOUNDED QUEUE UTILITY (Task 2) ==========
  // Fixed-size ring buffer to prevent unbounded queue growth
  const MAX_QUEUE_SIZE = 100 // Maximum items per queue
  function pushBounded<T>(buffer: T[], item: T, max: number): void {
    if (buffer.length >= max) {
      buffer.shift() // Remove oldest item
    }
    buffer.push(item)
  }
  // ================================================

  // ========== INGESTION THROTTLE (Task 3) ==========
  // Throttle enqueue rate to reduce per-message allocations
  const INGESTION_THROTTLE_MS = 1000 // Increased to 1000ms to reduce CPU load
  const lastRealtimeIngestRef = useRef<number>(Date.now())
  const lastSpcIngestRef = useRef<number>(Date.now())
  const pendingRealtimePayloadRef = useRef<RealtimeUpdateEvent | null>(null)
  const pendingSpcPayloadRef = useRef<SPCUpdateEvent | null>(null)
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // ================================================

  // Track if new data arrived (for visual indicator)
  const [newDataArrived, setNewDataArrived] = useState(false)
  const newDataTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)



  useEffect(() => {
    if (machineList.length > 0 && !selectedMachineId) {
      setSelectedMachineId(machineList[0].id)
    }
  }, [machineList, selectedMachineId])

  const selectedMachine = machines[selectedMachineId] || { name: t('machine.notFound') }

  // Use local last update time from auto-refresh
  const lastUpdate = lastDataUpdate

  // Calculate start timestamp based on selected time range
  const getTimeRangeBounds = useCallback((range: TimeRange): { start: string; end: string } => {
    const now = new Date()
    const end = now.toISOString()
    let start = new Date()

    switch (range) {
      case 'last15m':
        start = new Date(now.getTime() - 15 * 60 * 1000)
        break
      case 'last1h':
        start = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case 'last6h':
        start = new Date(now.getTime() - 6 * 60 * 60 * 1000)
        break
      case 'last24Hours':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'last3d':
        start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
        break
      case 'last7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
    }

    return { start: start.toISOString(), end }
  }, [])

  // Fetch chart data once on machine selection (for SPC analysis charts)
  useEffect(() => {
    if (!selectedMachineId) return

    const fetchChartData = async () => {
      setLoading(true)
      try {
        const { start, end } = getTimeRangeBounds(selectedTimeRange)
        const spcRes = await api.getSPCHistory(selectedMachineId, {
          start,
          end,
          limit: 50
        })
        setChartSpcHistory(spcRes.data)
        setLastDataUpdate(new Date())
      } catch (error) {
        console.error('Failed to fetch chart data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
  }, [selectedMachineId, selectedTimeRange, getTimeRangeBounds])

  // Throttled state update queue to prevent memory crash
  const updateQueueRef = useRef<{
    chartSpc: any[]
    tableSpc: any[]
    tableRealtime: any[]
    lastUpdate: Date | null
  }>({
    chartSpc: [],
    tableSpc: [],
    tableRealtime: [],
    lastUpdate: null
  })

  const isProcessingQueueRef = useRef(false)

  // Process queued updates in batch (runs every 2 seconds max)
  const processUpdateQueue = useCallback(() => {
    if (isProcessingQueueRef.current) return
    isProcessingQueueRef.current = true

    const queue = updateQueueRef.current
    const hasUpdates = queue.chartSpc.length > 0 ||
                       queue.tableSpc.length > 0 ||
                       queue.tableRealtime.length > 0

    if (hasUpdates) {
      // Batch all state updates together to minimize re-renders
      startTransition(() => {
        if (queue.chartSpc.length > 0) {
          setChartSpcHistory(prev => {
            const combined = [...prev, ...queue.chartSpc].slice(-50)
            return combined
          })
          queue.chartSpc = []
        }

        if (queue.tableRealtime.length > 0 && (activeTab === 'tech' || activeTab === 'realtime')) {
          setRealtimeHistory(prev => {
            return [...queue.tableRealtime, ...prev].slice(0, rowsPerPage)
          })
          queue.tableRealtime = []
        }

        if (queue.tableSpc.length > 0 && activeTab === 'spc') {
          setSpcHistory(prev => {
            return [...queue.tableSpc, ...prev].slice(0, rowsPerPage)
          })
          queue.tableSpc = []
        }

        if (queue.lastUpdate) {
          setLastDataUpdate(queue.lastUpdate)
          queue.lastUpdate = null
        }

        // Show visual indicator
        setNewDataArrived(true)
        if (newDataTimeoutRef.current) {
          clearTimeout(newDataTimeoutRef.current)
        }
        newDataTimeoutRef.current = setTimeout(() => {
          setNewDataArrived(false)
        }, 1000)
      })
    }

    isProcessingQueueRef.current = false
  }, [activeTab, rowsPerPage])

  // Simple throttle for queue processing
  const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const throttledProcessQueue = useCallback(() => {
    if (throttleTimeoutRef.current) return
    processUpdateQueue()
    throttleTimeoutRef.current = setTimeout(() => {
      throttleTimeoutRef.current = null
    }, 2000)
  }, [processUpdateQueue])

  // Cleanup throttle and timeouts on unmount
  useEffect(() => {
    return () => {
      if (newDataTimeoutRef.current) {
        clearTimeout(newDataTimeoutRef.current)
      }
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current)
      }
      if (spcTimerRef.current) {
        clearTimeout(spcTimerRef.current)
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current)
      }
    }
  }, [])

  // WebSocket handlers for real-time updates (with ingestion throttle - Task 3)
  const handleRealtimeUpdate = useCallback((payload: RealtimeUpdateEvent) => {
    // Skip if paused
    if (isPaused) return

    // Only process if it's for the selected machine
    if (payload.deviceId !== selectedMachine?.name) return

    // Process function (inlined to avoid circular dependency)
    const processRealtime = () => {
      const p = pendingRealtimePayloadRef.current
      if (!p) return
      const normalized = normalizeRealtimeData(p)
      if (activeTab === 'tech' || activeTab === 'realtime') {
        pushBounded(updateQueueRef.current.tableRealtime, { _time: normalized.time || p.timestamp, oil_temp: normalized.oil_temp, temp_1: normalized.temp_1, temp_2: normalized.temp_2, temp_3: normalized.temp_3, temp_4: normalized.temp_4, temp_5: normalized.temp_5, temp_6: normalized.temp_6, temp_7: normalized.temp_7, temp_8: normalized.temp_8, temp_9: normalized.temp_9, temp_10: normalized.temp_10, pressure: normalized.pressure, cycle_time: normalized.cycle_time }, MAX_QUEUE_SIZE)
      }
      updateQueueRef.current.lastUpdate = new Date(p.timestamp)
      pendingRealtimePayloadRef.current = null
      throttledProcessQueue()
    }

    // Store latest payload
    pendingRealtimePayloadRef.current = payload
    const now = Date.now()
    const timeSinceLastIngest = now - lastRealtimeIngestRef.current

    if (timeSinceLastIngest >= INGESTION_THROTTLE_MS) {
      lastRealtimeIngestRef.current = now
      processRealtime()
    } else if (!realtimeTimerRef.current) {
      const delay = INGESTION_THROTTLE_MS - timeSinceLastIngest
      realtimeTimerRef.current = setTimeout(() => { lastRealtimeIngestRef.current = Date.now(); realtimeTimerRef.current = null; processRealtime() }, delay)
    }
  }, [selectedMachine?.name, isPaused, activeTab, throttledProcessQueue])

  const handleSPCUpdate = useCallback((payload: SPCUpdateEvent) => {
    // Skip if paused
    if (isPaused) return

    // Only process if it's for the selected machine
    if (payload.deviceId !== selectedMachine?.name) return

    // Process function (inlined to avoid circular dependency)
    const processSpc = () => {
      const p = pendingSpcPayloadRef.current
      if (!p) return
      const normalized = normalizeSPCData(p)
      pushBounded(
        updateQueueRef.current.chartSpc,
        { id: updateQueueRef.current.chartSpc.length + 1, value: normalized.cycle_time || 0, timestamp: normalized.time || p.timestamp },
        MAX_QUEUE_SIZE
      )
      if (activeTab === 'spc') {
        pushBounded(updateQueueRef.current.tableSpc, { _time: normalized.time || p.timestamp, cycle_time: normalized.cycle_time, cycle_number: normalized.cycle_number, injection_velocity_max: normalized.injection_velocity_max, injection_pressure_max: normalized.injection_pressure_max, injection_time: normalized.injection_time, switch_pack_time: normalized.switch_pack_time, switch_pack_pressure: normalized.switch_pack_pressure, switch_pack_position: normalized.switch_pack_position, plasticizing_time: normalized.plasticizing_time, plasticizing_pressure_max: normalized.plasticizing_pressure_max, temp_1: normalized.temp_1, temp_2: normalized.temp_2, temp_3: normalized.temp_3, temp_4: normalized.temp_4, temp_5: normalized.temp_5, temp_6: normalized.temp_6, temp_7: normalized.temp_7, temp_8: normalized.temp_8, temp_9: normalized.temp_9, temp_10: normalized.temp_10 }, MAX_QUEUE_SIZE)
      }
      updateQueueRef.current.lastUpdate = new Date(p.timestamp)
      pendingSpcPayloadRef.current = null
      throttledProcessQueue()
    }

    // Store latest payload
    pendingSpcPayloadRef.current = payload
    const now = Date.now()
    const timeSinceLastIngest = now - lastSpcIngestRef.current

    if (timeSinceLastIngest >= INGESTION_THROTTLE_MS) {
      lastSpcIngestRef.current = now
      processSpc()
    } else if (!spcTimerRef.current) {
      const delay = INGESTION_THROTTLE_MS - timeSinceLastIngest
      spcTimerRef.current = setTimeout(() => { lastSpcIngestRef.current = Date.now(); spcTimerRef.current = null; processSpc() }, delay)
    }
  }, [selectedMachine?.name, isPaused, activeTab, throttledProcessQueue])

  // Use refs to stabilize WebSocket handlers (prevents re-subscription on callback changes)
  const handleRealtimeUpdateRef = useRef(handleRealtimeUpdate)
  const handleSPCUpdateRef = useRef(handleSPCUpdate)

  // Keep refs in sync with latest callbacks
  handleRealtimeUpdateRef.current = handleRealtimeUpdate
  handleSPCUpdateRef.current = handleSPCUpdate

  // Subscribe to machine and listen for WebSocket updates
  useEffect(() => {
    if (!selectedMachineId || !selectedMachine) return

    // Subscribe to the machine (using machineName as deviceId)
    socketService.subscribeToMachine(selectedMachine.name)
    setIsSubscribed(true)

    // Listen for realtime and SPC updates using ref pattern
     const realtimeHandler = (payload: RealtimeUpdateEvent) => handleRealtimeUpdateRef.current(payload)
     const spcHandler = (payload: SPCUpdateEvent) => handleSPCUpdateRef.current(payload)

     socketService.on('realtime-update', realtimeHandler)
     socketService.on('spc-update', spcHandler)

    return () => {
      // Unsubscribe from machine when changing machines or unmounting
      if (selectedMachine.name) {
        socketService.unsubscribeFromMachine(selectedMachine.name)
      }
      socketService.off('realtime-update', realtimeHandler)
      socketService.off('spc-update', spcHandler)
      setIsSubscribed(false)
    }
  }, [selectedMachineId, selectedMachine?.name]) // Removed handler dependencies

  // Fetch paginated table data based on active tab (server-side pagination)
  useEffect(() => {
    if (!selectedMachineId) return

    const fetchTableData = async () => {
      setTableLoading(true)
      try {
        // Calculate offset for current page (server-side pagination)
        const offset = (currentPage - 1) * rowsPerPage
        const { start, end } = getTimeRangeBounds(selectedTimeRange)

        // Determine which data to fetch based on active tab
        if (activeTab === 'tech' || activeTab === 'realtime') {
          // Keep existing data visible during fetch to prevent blinking

          const realtimeRes = await api.getRealtimeHistory(selectedMachineId, {
            start,
            end,
            limit: rowsPerPage,
            offset: offset
          })

          setRealtimeHistory(realtimeRes.data)
          setRealtimePagination(realtimeRes.pagination)
        } else if (activeTab === 'spc') {
          // Keep existing data visible during fetch to prevent blinking

          const spcRes = await api.getSPCHistory(selectedMachineId, {
            start,
            end,
            limit: rowsPerPage,
            offset: offset
          })

          setSpcHistory(spcRes.data)
          setSpcPagination(spcRes.pagination)
        }
      } catch (error) {
        console.error('Failed to fetch table data:', error)
      } finally {
        setTableLoading(false)
      }
    }

    fetchTableData()
  }, [selectedMachineId, activeTab, currentPage, selectedTimeRange, getTimeRangeBounds]) // Added selectedTimeRange - fetch when time range changes

  // Tech Data - server-side pagination (no client-side slicing)
  const techData = useMemo(() => {
    if (activeTab !== 'tech') return []
    // Data is already paginated from API, no client-side slicing needed
    const data = realtimeHistory.map((d: any) => ({
      timestamp: d._time || d.time,
      parameter: t('spc.tableHeaders.oil'),
      value: d.oil_temp,
      unit: t('units.celsius')
    }))
    return data
  }, [realtimeHistory, activeTab, t])

  // SPC Wide Table Data - server-side pagination (no client-side slicing)
  const spcWideTableData = useMemo(() => {
    if (activeTab !== 'spc') return []
    // Data is already paginated from API, no client-side slicing needed
    const data = spcHistory.map((d: any) => ({
      timestamp: d._time || d.time,
      cycleTime: d.cycle_time,
      cycleNumber: d.cycle_number,
      injectionVelocityMax: d.injection_velocity_max,
      injectionPressureMax: d.injection_pressure_max,
      injectionTime: d.injection_time,
      switchPackTime: d.switch_pack_time,
      switchPackPressure: d.switch_pack_pressure,
      switchPackPosition: d.switch_pack_position,
      plasticizingTime: d.plasticizing_time,
      plasticizingPressureMax: d.plasticizing_pressure_max,
      temp1: d.temp_1,
      temp2: d.temp_2,
      temp3: d.temp_3,
      temp4: d.temp_4,
      temp5: d.temp_5,
      temp6: d.temp_6,
      temp7: d.temp_7,
      temp8: d.temp_8,
      temp9: d.temp_9,
      temp10: d.temp_10,
    }))
    return data
  }, [spcHistory, activeTab])

  // Realtime Data - multi-column layout (1 row per timestamp, 13 metrics as columns)
  const realtimeTableData = useMemo(() => {
    if (activeTab !== 'realtime') return []

    // Transform each timestamp into a single row with all metrics as columns
    const data = realtimeHistory.map((d: any) => ({
      timestamp: d._time || d.time,
      oilTemp: d.oil_temp,
      temp1: d.temp_1,
      temp2: d.temp_2,
      temp3: d.temp_3,
      temp4: d.temp_4,
      temp5: d.temp_5,
      temp6: d.temp_6,
      temp7: d.temp_7,
      temp8: d.temp_8,
      temp9: d.temp_9,
      temp10: d.temp_10,
      pressure: d.pressure,
      cycleTime: d.cycle_time
    }))
    return data
  }, [realtimeHistory, activeTab])

  // Export handler with scope support
  const handleExportReport = async (scope: 'page' | 'tab' | 'all') => {
    try {
      setIsExporting(true)
      const { start, end } = getTimeRangeBounds(selectedTimeRange)

      if (scope === 'page') {
        // Export currently visible page data only
        const filename = exportSPCDataToExcel(
          spcHistory,
          realtimeHistory,
          selectedMachine.name
        )
        toast.success(`${t('spc.export.currentPage', { rows: rowsPerPage })}: ${filename}`)
      } else if (scope === 'tab') {
        // Fetch all data for active tab
        if (activeTab === 'tech' || activeTab === 'realtime') {
          const res = await api.getRealtimeHistory(selectedMachineId, { start, end, limit: 1000 })
          const filename = exportSPCDataToExcel([], res.data, selectedMachine.name)
          toast.success(`${t('spc.tabs.' + activeTab)} ${t('common.export')}: ${filename}`)
        } else if (activeTab === 'spc') {
          const res = await api.getSPCHistory(selectedMachineId, { start, end, limit: 1000 })
          const filename = exportSPCDataToExcel(res.data, [], selectedMachine.name)
          toast.success(`${t('spc.tabs.spc')} ${t('common.export')}: ${filename}`)
        }
      } else if (scope === 'all') {
        // Fetch all data from both sources
        toast.info('Fetching all data... This may take a moment.')
        const [spcRes, realtimeRes] = await Promise.all([
          api.getSPCHistory(selectedMachineId, { start, end, limit: 1000 }),
          api.getRealtimeHistory(selectedMachineId, { start, end, limit: 1000 })
        ])
        const filename = exportSPCDataToExcel(spcRes.data, realtimeRes.data, selectedMachine.name)
        toast.success(`${t('spc.export.allData')}: ${filename}`)
      }
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Pagination handlers
  const handlePageChange = (page: number) => {
    // Calculate max page based on active tab
    let maxPage = 1
    if (activeTab === 'realtime') {
      // Realtime tab: 1 row per timestamp
      maxPage = Math.ceil(realtimePagination.total / rowsPerPage)
    } else if (activeTab === 'spc') {
      maxPage = Math.ceil(spcPagination.total / rowsPerPage)
    } else {
      // Tech tab
      maxPage = Math.ceil(realtimePagination.total / rowsPerPage)
    }

    // Ensure page is within valid range
    const validPage = Math.min(Math.max(1, page), maxPage || 1)
    setCurrentPage(validPage)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setCurrentPage(1) // Reset to first page when switching tabs
  }

  // Calculate total rows for realtime tab (1 row per timestamp)
  const realtimeTotalRows = useMemo(() => {
    // Use API pagination total directly (1 row per timestamp with all metrics as columns)
    return realtimePagination.total
  }, [realtimePagination.total])

  // Metric categories configuration
  const metricCategories = useMemo(() => [
    {
      category: t('spc.category.cycle'),
      metrics: [
        { name: t('spc.tableHeaders.cycleTime'), field: 'cycle_time', unit: t('units.seconds'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.cycleNo'), field: 'cycle_number', unit: '-', dataSource: 'spc' as const }
      ]
    },
    {
      category: t('spc.category.injection'),
      metrics: [
        { name: t('spc.tableHeaders.injVelMax'), field: 'injection_velocity_max', unit: t('units.millimeterPerSecond'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.injPresMax'), field: 'injection_pressure_max', unit: t('units.bar'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.injTime'), field: 'injection_time', unit: t('units.seconds'), dataSource: 'spc' as const }
      ]
    },
    {
      category: t('spc.category.packHold'),
      metrics: [
        { name: t('spc.tableHeaders.swPackTime'), field: 'switch_pack_time', unit: t('units.seconds'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.swPackPres'), field: 'switch_pack_pressure', unit: t('units.bar'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.swPackPos'), field: 'switch_pack_position', unit: t('units.millimeter'), dataSource: 'spc' as const }
      ]
    },
    {
      category: t('spc.category.plasticizing'),
      metrics: [
        { name: t('spc.tableHeaders.plastTime'), field: 'plasticizing_time', unit: t('units.seconds'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.plastPresMax'), field: 'plasticizing_pressure_max', unit: t('units.bar'), dataSource: 'spc' as const }
      ]
    },
    {
      category: t('spc.category.temperature'),
      defaultOpen: false, // Collapsed by default since there are many temperature zones
      metrics: [
        { name: t('spc.tableHeaders.zone', { number: '1' }), field: 'temp_1', unit: t('units.celsius'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.zone', { number: '2' }), field: 'temp_2', unit: t('units.celsius'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.zone', { number: '3' }), field: 'temp_3', unit: t('units.celsius'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.zone', { number: '4' }), field: 'temp_4', unit: t('units.celsius'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.zone', { number: '5' }), field: 'temp_5', unit: t('units.celsius'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.zone', { number: '6' }), field: 'temp_6', unit: t('units.celsius'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.zone', { number: '7' }), field: 'temp_7', unit: t('units.celsius'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.zone', { number: '8' }), field: 'temp_8', unit: t('units.celsius'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.zone', { number: '9' }), field: 'temp_9', unit: t('units.celsius'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.zone', { number: '10' }), field: 'temp_10', unit: t('units.celsius'), dataSource: 'spc' as const },
        { name: t('spc.tableHeaders.oil'), field: 'oil_temp', unit: t('units.celsius'), dataSource: 'realtime' as const }
      ]
    }
  ], [t])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('spc.title')}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">{t('spc.subtitle', { machine: selectedMachine.name })}</p>
            {isSubscribed && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1 text-xs">
                  {isPaused ? (
                    <>
                      <Pause className="h-3 w-3 text-amber-500" />
                      <span className="text-amber-600">{t('common.paused')}</span>
                    </>
                  ) : (
                    <>
                      <div className={cn("h-2 w-2 rounded-full", newDataArrived ? "bg-green-500 animate-pulse" : "bg-green-500")} />
                      <span className="text-green-600">{t('common.live')}</span>
                    </>
                  )}
                </div>
              </>
            )}
            {lastUpdate && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <RefreshCcw className={cn("h-3 w-3", newDataArrived && "animate-spin")} />
                  <span>{t('spc.lastUpdated', { time: formatLocaleString(lastUpdate instanceof Date ? lastUpdate.toISOString() : lastUpdate, '--') })}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={t('factory.filterMachine')} />
            </SelectTrigger>
            <SelectContent>
              {machineList.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name} ({m.id})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-initial"
              onClick={() => setIsPaused(!isPaused)}
              disabled={!isSubscribed}
            >
              {isPaused ? (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  {t('common.resume')}
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  {t('common.pause')}
                </>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
                  <Calendar className="mr-2 h-4 w-4" />
                  {t(`timeRange.${selectedTimeRange}`)}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedTimeRange('last15m')}>
                  {t('timeRange.last15m')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedTimeRange('last1h')}>
                  {t('timeRange.last1h')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedTimeRange('last6h')}>
                  {t('timeRange.last6h')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedTimeRange('last24Hours')}>
                  {t('timeRange.last24Hours')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedTimeRange('last3d')}>
                  {t('timeRange.last3d')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedTimeRange('last7d')}>
                  {t('timeRange.last7d')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="flex-1 sm:flex-initial"
                  disabled={isExporting || loading}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('spc.export.exporting')}
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      {t('spc.export.button')}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportReport('page')}>
                  {t('spc.export.currentPage', { rows: rowsPerPage })}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportReport('tab')}>
                  {t('spc.export.currentTab')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportReport('all')}>
                  {t('spc.export.allData')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {loading && !chartSpcHistory.length ? (
        <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <>
      {/* Metric Category Sections */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">{t('spc.metricsAnalysis')}</h2>
        <div className="space-y-4">
          {metricCategories.map((cat) => (
            <MetricCategorySection
              key={cat.category}
              category={cat.category}
              metrics={cat.metrics}
              isOpen={isCategoryOpen(cat.category)}
              onOpenChange={() => toggleCategoryOpen(cat.category)}
              machineId={selectedMachineId}
              deviceId={selectedMachine.deviceId}
              isPaused={isPaused}
              timeWindow={TIME_RANGE_TO_WINDOW[selectedTimeRange]}
            />
          ))}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setRawDataLogsOpen(!rawDataLogsOpen)}
          className="w-full px-4 py-3 bg-muted/50 hover:bg-muted/80 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{t('spc.rawDataLogs')}</h2>
          </div>
          {rawDataLogsOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {rawDataLogsOpen && (
          <div className="p-4 bg-background">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                <TabsTrigger value="tech">{t('spc.tabs.tech')}</TabsTrigger>
                <TabsTrigger value="spc">{t('spc.tabs.spc')}</TabsTrigger>
                <TabsTrigger value="realtime">{t('spc.tabs.realtime')}</TabsTrigger>
              </TabsList>

              <TabsContent value="tech" className="mt-0">
                <Card className="rounded-sm border border-border bg-card shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('spc.techDataLog')}</CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    {tableLoading && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-border">
                          <TableHead className="h-8 text-xs font-medium">{t('spc.tableHeaders.time')}</TableHead>
                          <TableHead className="h-8 text-xs font-medium">{t('spc.tableHeaders.parameter')}</TableHead>
                          <TableHead className="h-8 text-xs font-medium">{t('spc.tableHeaders.value')}</TableHead>
                          <TableHead className="h-8 text-xs font-medium">{t('spc.tableHeaders.unit')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {techData.map((row: any, i: number) => (
                          <TableRow key={i} className="hover:bg-muted/50 border-border">
                            <TableCell className="py-2 text-xs font-mono text-muted-foreground">{formatLocaleTime(row.timestamp)}</TableCell>
                            <TableCell className="py-2 text-xs font-medium">{row.parameter}</TableCell>
                            <TableCell className="py-2 text-xs font-mono">{row.value}</TableCell>
                            <TableCell className="py-2 text-xs text-muted-foreground">{row.unit}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(realtimePagination.total / rowsPerPage)}
                        onPageChange={handlePageChange}
                        totalRecords={realtimePagination.total}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="spc" className="mt-0">
                <Card className="rounded-sm border border-border bg-card shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('spc.spcMeasurementLog')}</CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    {tableLoading && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-border">
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.time')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.cycleTime')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.cycleNo')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.injVelMax')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.injPresMax')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.injTime')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.swPackTime')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.swPackPres')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.swPackPos')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.plastTime')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.plastPresMax')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.zone', { number: '1' })}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.zone', { number: '2' })}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.zone', { number: '3' })}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.zone', { number: '4' })}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.zone', { number: '5' })}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.zone', { number: '6' })}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.zone', { number: '7' })}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.zone', { number: '8' })}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.zone', { number: '9' })}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.zone', { number: '10' })}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {spcWideTableData.map((row: any, i: number) => (
                            <TableRow key={i} className="hover:bg-muted/50 border-border">
                              <TableCell className="py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">{formatLocaleTime(row.timestamp)}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.cycleTime}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.cycleNumber}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.injectionVelocityMax}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.injectionPressureMax}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.injectionTime}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.switchPackTime}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.switchPackPressure}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.switchPackPosition}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.plasticizingTime}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.plasticizingPressureMax}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp1}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp2}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp3}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp4}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp5}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp6}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp7}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp8}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp9}</TableCell>
                              <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp10}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-4">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(spcPagination.total / rowsPerPage)}
                        onPageChange={handlePageChange}
                        totalRecords={spcPagination.total}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="realtime" className="mt-0">
                <Card className="rounded-sm border border-border bg-card shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('spc.sensorDataLog')}</CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    {tableLoading && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-border">
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.time')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.oil')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">Z1 {t('units.celsius')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">Z2 {t('units.celsius')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">Z3 {t('units.celsius')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">Z4 {t('units.celsius')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">Z5 {t('units.celsius')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">Z6 {t('units.celsius')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">Z7 {t('units.celsius')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">Z8 {t('units.celsius')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">Z9 {t('units.celsius')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">Z10 {t('units.celsius')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.press')}</TableHead>
                            <TableHead className="h-8 text-xs font-medium whitespace-nowrap">{t('spc.tableHeaders.cycle')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {realtimeTableData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                                {t('common.noData')}
                              </TableCell>
                            </TableRow>
                          ) : (
                            realtimeTableData.map((row: any, i: number) => (
                              <TableRow key={i} className="hover:bg-muted/50 border-border">
                                <TableCell className="py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
                                  {formatLocaleTime(row.timestamp)}
                                </TableCell>
                                <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.oilTemp}</TableCell>
                                <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp1}</TableCell>
                                <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp2}</TableCell>
                                <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp3}</TableCell>
                                <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp4}</TableCell>
                                <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp5}</TableCell>
                                <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp6}</TableCell>
                                <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp7}</TableCell>
                                <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp8}</TableCell>
                                <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp9}</TableCell>
                                <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.temp10}</TableCell>
                                <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.pressure}</TableCell>
                                <TableCell className="py-2 text-xs font-mono whitespace-nowrap">{row.cycleTime}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-4">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(realtimeTotalRows / rowsPerPage)}
                        onPageChange={handlePageChange}
                        totalRecords={realtimeTotalRows}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  )
}
