import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { api } from '@/services/api'
import { Loader2 } from 'lucide-react'
import type { RealtimeDataPoint, SPCDataPoint } from '@/types/api'

interface ZoneTemperatureGridProps {
  machineId?: string | number
  dataSource?: 'realtime' | 'spc'  // Default: 'realtime' (7 zones) or 'spc' (10 zones)
}

interface ZoneData {
  id: string
  temp: number | null
  target: number
  status: 'normal' | 'warning' | 'critical' | 'unavailable'
}

export function ZoneTemperatureGrid({ machineId, dataSource = 'realtime' }: ZoneTemperatureGridProps) {
  const [zones, setZones] = useState<ZoneData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTemperatureData = async () => {
      if (!machineId) {
        // No machine selected, show all zones as unavailable
        setZones(generateZonesWithData(null, dataSource))
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch based on dataSource
        if (dataSource === 'spc') {
          const response = await api.getSPCHistory(machineId, { limit: 1 })
          const latest = response.data?.[0]
          setZones(generateZonesWithData(latest || null, 'spc'))
        } else {
          const response = await api.getRealtimeHistory(machineId, { limit: 1 })
          const latest = response.data?.[0]
          setZones(generateZonesWithData(latest || null, 'realtime'))
        }
      } catch (err) {
        console.error('Failed to fetch temperature data:', err)
        setError('Failed to load temperature data')
        setZones(generateZonesWithData(null, dataSource))
      } finally {
        setLoading(false)
      }
    }

    fetchTemperatureData()

    // Refresh every 30 seconds
    const interval = setInterval(fetchTemperatureData, 30000)
    return () => clearInterval(interval)
  }, [machineId, dataSource])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-status-red text-white'
      case 'warning':
        return 'bg-status-yellow text-white'
      case 'unavailable':
        return 'bg-muted text-muted-foreground'
      default:
        return 'bg-secondary text-foreground'
    }
  }

  const getStatusFromTemp = (temp: number | null, target: number): ZoneData['status'] => {
    if (temp === null) return 'unavailable'
    const deviation = Math.abs(temp - target)
    if (deviation > 10) return 'critical'
    if (deviation > 5) return 'warning'
    return 'normal'
  }

  const generateZonesWithData = (data: RealtimeDataPoint | SPCDataPoint | null, source: 'realtime' | 'spc'): ZoneData[] => {
    const target = 220

    // Determine how many zones to show based on data source
    const zoneCount = source === 'spc' ? 10 : 7

    const zones: ZoneData[] = []

    for (let i = 1; i <= zoneCount; i++) {
      const tempKey = `temp_${i}` as keyof (RealtimeDataPoint | SPCDataPoint)
      const temp = data?.[tempKey] as number | undefined

      zones.push({
        id: `Z-${i}`,
        temp: temp ?? null,
        target,
        status: getStatusFromTemp(temp ?? null, target)
      })
    }

    return zones
  }

  if (loading) {
    return (
      <Card className="muji-card shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium tracking-tight">Zone Temperatures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const zoneCountLabel = dataSource === 'spc' ? '10 Zones' : '7 Zones'

  return (
    <Card className="muji-card shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium tracking-tight">
          Zone Temperatures ({dataSource === 'spc' ? 'SPC' : 'Realtime'} - {zoneCountLabel})
        </CardTitle>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className={cn(
                'p-3 rounded-sm flex flex-col items-center justify-center transition-colors',
                getStatusColor(zone.status)
              )}
            >
              <div className="text-xs font-medium uppercase tracking-wider opacity-80">{zone.id}</div>
              <div className="text-xl font-mono font-bold my-1">
                {zone.temp !== null ? `${zone.temp.toFixed(1)}°` : 'N/A'}
              </div>
              <div className="text-[10px] opacity-70">Target: {zone.target}°</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
