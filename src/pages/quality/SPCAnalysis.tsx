import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSelector } from 'react-redux'
import { ControlChart } from '@/components/spc/ControlChart'
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
import { normalizeHistoryData, normalizeRealtimeData, normalizeSPCData } from '@/utils/fieldMapping'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { RealtimeUpdateEvent, SPCUpdateEvent } from '@/types/api'
import { useTranslation } from 'react-i18next'

export default function SPCAnalysis() {
  const { t } = useTranslation()
  const machines = useSelector((state: RootState) => state.machines.machines)
  const machineList = Object.values(machines).sort((a, b) => a.id.localeCompare(b.id))
  
  const [selectedMachineId, setSelectedMachineId] = useState<string>('')

  // Chart data - fetched once with higher limit for SPC analysis charts
  const [chartSpcHistory, setChartSpcHistory] = useState<any[]>([])
  const [chartRealtimeHistory, setChartRealtimeHistory] = useState<any[]>([])

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

  // Track if new data arrived (for visual indicator)
  const [newDataArrived, setNewDataArrived] = useState(false)
  const newDataTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (newDataTimeoutRef.current) {
        clearTimeout(newDataTimeoutRef.current)
      }
    }
  }, [])



  useEffect(() => {
    if (machineList.length > 0 && !selectedMachineId) {
      setSelectedMachineId(machineList[0].id)
    }
  }, [machineList, selectedMachineId])

  const selectedMachine = machines[selectedMachineId] || { name: t('machine.notFound') }

  // Use local last update time from auto-refresh
  const lastUpdate = lastDataUpdate

  // Fetch chart data once on machine selection (for SPC analysis charts)
  useEffect(() => {
    if (!selectedMachineId) return

    const fetchChartData = async () => {
      setLoading(true)
      try {
        const [spcRes, realtimeRes] = await Promise.all([
          api.getSPCHistory(selectedMachineId, { limit: 50 }),
          api.getRealtimeHistory(selectedMachineId, { limit: 50 })
        ])


        setChartSpcHistory(spcRes.data)
        setChartRealtimeHistory(normalizeHistoryData(realtimeRes.data))
        setLastDataUpdate(new Date())  // Track when data was last fetched
      } catch (error) {
        console.error('Failed to fetch chart data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
  }, [selectedMachineId])

  // WebSocket handlers for real-time updates
  const handleRealtimeUpdate = useCallback((payload: RealtimeUpdateEvent) => {
    // Skip if paused
    if (isPaused) return

    // Only process if it's for the selected machine
    if (payload.deviceId !== selectedMachine?.name) return

    // Normalize and append to chart data
    const normalized = normalizeRealtimeData(payload)

    // Update chart data with new point (keep latest 50 points)
    setChartRealtimeHistory(prev => {
      const newData = [...prev, {
        id: prev.length + 1,
        value: normalized.temp_1 || normalized.oil_temp || 0,
        timestamp: normalized.time || payload.timestamp
      }]
      return newData.slice(-50)  // Keep latest 50
    })

    // Update table data if on tech or realtime tab (real-time table updates)
    if (activeTab === 'tech' || activeTab === 'realtime') {
      setRealtimeHistory(prev => {
        const newRow = {
          _time: normalized.time || payload.timestamp,
          oil_temp: normalized.oil_temp,
          temp_1: normalized.temp_1,
          temp_2: normalized.temp_2,
          temp_3: normalized.temp_3,
          temp_4: normalized.temp_4,
          temp_5: normalized.temp_5,
          temp_6: normalized.temp_6,
          temp_7: normalized.temp_7,
          temp_8: normalized.temp_8,
          temp_9: normalized.temp_9,
          temp_10: normalized.temp_10,
          pressure: normalized.pressure,
          cycle_time: normalized.cycle_time
        }
        // Prepend new data, keep only current page size
        return [newRow, ...prev.slice(0, rowsPerPage - 1)]
      })
    }

    // Update lastDataUpdate timestamp
    setLastDataUpdate(new Date(payload.timestamp))

    // Show visual indicator that new data arrived
    setNewDataArrived(true)
    if (newDataTimeoutRef.current) {
      clearTimeout(newDataTimeoutRef.current)
    }
    newDataTimeoutRef.current = setTimeout(() => {
      setNewDataArrived(false)
    }, 1000)
  }, [selectedMachine?.name, activeTab, isPaused, rowsPerPage])

  const handleSPCUpdate = useCallback((payload: SPCUpdateEvent) => {
    // Skip if paused
    if (isPaused) return

    // Only process if it's for the selected machine
    if (payload.deviceId !== selectedMachine?.name) return

    // Normalize the SPC data
    const normalized = normalizeSPCData(payload)

    // Update SPC chart data with new cycle time point (keep latest 50)
    setChartSpcHistory(prev => {
      const newData = [...prev, {
        id: prev.length + 1,
        value: normalized.cycle_time || 0,
        timestamp: normalized.time || payload.timestamp
      }]
      return newData.slice(-50)  // Keep latest 50
    })

    // Update table data if on SPC tab (real-time table updates)
    if (activeTab === 'spc') {
      setSpcHistory(prev => {
        const newRow = {
          _time: normalized.time || payload.timestamp,
          cycle_time: normalized.cycle_time,
          cycle_number: normalized.cycle_number,
          injection_velocity_max: normalized.injection_velocity_max,
          injection_pressure_max: normalized.injection_pressure_max,
          injection_time: normalized.injection_time,
          switch_pack_time: normalized.switch_pack_time,
          switch_pack_pressure: normalized.switch_pack_pressure,
          switch_pack_position: normalized.switch_pack_position,
          plasticizing_time: normalized.plasticizing_time,
          plasticizing_pressure_max: normalized.plasticizing_pressure_max,
          temp_1: normalized.temp_1,
          temp_2: normalized.temp_2,
          temp_3: normalized.temp_3,
          temp_4: normalized.temp_4,
          temp_5: normalized.temp_5,
          temp_6: normalized.temp_6,
          temp_7: normalized.temp_7,
          temp_8: normalized.temp_8,
          temp_9: normalized.temp_9,
          temp_10: normalized.temp_10,
        }
        // Prepend new data, keep only current page size
        return [newRow, ...prev.slice(0, rowsPerPage - 1)]
      })
    }

    // Update lastDataUpdate timestamp
    setLastDataUpdate(new Date(payload.timestamp))

    // Show visual indicator that new data arrived
    setNewDataArrived(true)
    if (newDataTimeoutRef.current) {
      clearTimeout(newDataTimeoutRef.current)
    }
    newDataTimeoutRef.current = setTimeout(() => {
      setNewDataArrived(false)
    }, 1000)
  }, [selectedMachine?.name, activeTab, isPaused, rowsPerPage])

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

        // Determine which data to fetch based on active tab
        if (activeTab === 'tech' || activeTab === 'realtime') {
          // Keep existing data visible during fetch to prevent blinking

          const realtimeRes = await api.getRealtimeHistory(selectedMachineId, {
            limit: rowsPerPage,
            offset: offset
          })

          setRealtimeHistory(realtimeRes.data)
          setRealtimePagination(realtimeRes.pagination)
        } else if (activeTab === 'spc') {
          // Keep existing data visible during fetch to prevent blinking

          const spcRes = await api.getSPCHistory(selectedMachineId, {
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
  }, [selectedMachineId, activeTab, currentPage]) // Added currentPage - fetch when page changes

  const tempData = useMemo(() => {
    const data = chartRealtimeHistory.map((d: any, i: number) => ({
      id: i + 1,
      value: d.temp_1
    }))
    return data
  }, [chartRealtimeHistory])

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
          const res = await api.getRealtimeHistory(selectedMachineId, { limit: 1000 })
          const filename = exportSPCDataToExcel([], res.data, selectedMachine.name)
          toast.success(`${t('spc.tabs.' + activeTab)} ${t('common.export')}: ${filename}`)
        } else if (activeTab === 'spc') {
          const res = await api.getSPCHistory(selectedMachineId, { limit: 1000 })
          const filename = exportSPCDataToExcel(res.data, [], selectedMachine.name)
          toast.success(`${t('spc.tabs.spc')} ${t('common.export')}: ${filename}`)
        }
      } else if (scope === 'all') {
        // Fetch all data from both sources
        toast.info('Fetching all data... This may take a moment.')
        const [spcRes, realtimeRes] = await Promise.all([
          api.getSPCHistory(selectedMachineId, { limit: 1000 }),
          api.getRealtimeHistory(selectedMachineId, { limit: 1000 })
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

  // Pre-compute all chart data to avoid redundant transformations in MetricCategorySection
  const chartDataByField = useMemo(() => {
    const dataMap: Record<string, any[]> = {}

    // Helper function to transform metric data
    const transformMetricData = (history: any[], field: string) => {
      return history
        .map((d) => {
          const rawValue = d[field]
          const value = typeof rawValue === 'string' ? Number.parseFloat(rawValue) : rawValue

          if (!Number.isFinite(value)) {
            return null
          }

          return {
            value,
            timestamp: d._time || d.time
          }
        })
        .filter((point): point is { value: number; timestamp: string } => point !== null)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-50) // Keep latest 50 points
        .map((point, i) => ({
          id: i + 1,
          value: point.value,
          timestamp: point.timestamp
        }))
    }

    // Pre-compute data for all metrics
    metricCategories.forEach(category => {
      category.metrics.forEach(metric => {
        const history = metric.dataSource === 'spc' ? chartSpcHistory : chartRealtimeHistory
        dataMap[metric.field] = transformMetricData(history, metric.field)
      })
    })

    return dataMap
  }, [chartSpcHistory, chartRealtimeHistory, metricCategories])

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
            <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
              <Calendar className="mr-2 h-4 w-4" />
              {t('timeRange.last24Hours')}
            </Button>
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
          <ControlChart
            title={`${t('spc.meltTemperature')} (${t('units.celsius')})`}
            data={tempData}
            ucl={228}
            lcl={212}
            mean={220}
            unit={t('units.celsius')}
          />

      {/* Metric Category Sections */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">{t('spc.metricsAnalysis')}</h2>
        <div className="space-y-4">
          {metricCategories.map((cat) => (
            <MetricCategorySection
              key={cat.category}
              category={cat.category}
              metrics={cat.metrics}
              chartData={chartDataByField}
              defaultOpen={cat.defaultOpen}
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
