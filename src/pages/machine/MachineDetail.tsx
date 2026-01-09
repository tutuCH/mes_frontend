import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { type RootState } from '@/store'
import { NowPanel } from '@/components/machine/NowPanel'
import { TrendChart } from '@/components/machine/TrendChart'
import { EventTimeline } from '@/components/machine/EventTimeline'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/services/api'

export default function MachineDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const machine = useSelector((state: RootState) => 
    state.machines.machines[id || '']
  )

  const [historyData, setHistoryData] = useState<any[]>([])

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      try {
        const res = await api.getRealtimeHistory(id, { limit: 50 })
        setHistoryData(res.data)
      } catch (error) {
        console.error('Failed to fetch machine history:', error)
      }
    }

    fetchData()
  }, [id])
  const trendData = useMemo(() => {
    return historyData.map((d: any) => ({
      time: new Date(d._time).toLocaleTimeString(),
      temp: d.temp_1,
      oilTemp: d.oil_temp,
      pressure: d.pressure || null, // May not be available in all records
      cycleTime: d.cycle_time || null // May not be available in realtime data
    })).reverse() // API returns newest first, reverse for chronological order
  }, [historyData])
  console.log('[MachineDetail] historyData:', historyData)
  // Mock events for now as we don't have an events API yet
  // In a real app, we would fetch these or derive them from status changes
  const events = useMemo(() => {
    return [
      { time: new Date().toLocaleTimeString(), type: 'STATUS', message: `Machine is ${machine?.status || 'Unknown'}`, severity: 'info' as const }
    ]
  }, [machine])

  if (!machine) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-500">{t('machine.notFound')}</h2>
        <Link to="/" className="text-blue-500 hover:underline mt-4 block">
          {t('machine.returnDashboard')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{machine.name}</h1>
          <div className="text-sm text-muted-foreground">
            {t('machine.id')}: {machine.id} | {t('machine.status')}: <span className="uppercase font-semibold">{machine.status}</span>
          </div>
        </div>
      </div>

      <NowPanel machine={machine} />

      <div className="grid gap-4 md:grid-cols-7">
        <TrendChart data={trendData} />
        <EventTimeline events={events} />
      </div>
    </div>
  )
}
