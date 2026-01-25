import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { type RootState } from '@/store'
import { NowPanel } from '@/components/machine/NowPanel'
import { EventTimeline } from '@/components/machine/EventTimeline'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function MachineDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const machine = useSelector((state: RootState) => 
    state.machines.machines[id || '']
  )

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

      <div className="grid gap-4">
        <EventTimeline events={events} />
      </div>
    </div>
  )
}
