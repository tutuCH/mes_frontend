import { useMemo, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle, ChevronDown, TrendingDown, TrendingUp } from 'lucide-react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

type ControlStatus = 'in-control' | 'breached-ucl' | 'breached-lcl' | 'unknown'

interface SPCStatsProps {
  field: string
  unit: string
  name: string
  current: number
  mean: number
  ucl: number
  lcl: number
  count: number
  stdDev: number
  median: number
  min: number
  max: number
  p95: number
  windowStart: string
  windowEnd: string
  sigma: number
  method: string
  dataPoints: Array<{ ts: string; value: number }>
  className?: string
}

export const SPCStatsPanel: React.FC<SPCStatsProps> = ({
  field,
  unit,
  name,
  current,
  mean = 0,
  ucl = 0,
  lcl = 0,
  count = 0,
  stdDev = 0,
  median = 0,
  min = 0,
  max = 0,
  p95 = 0,
  windowStart = '',
  windowEnd = '',
  sigma = 0,
  method = '',
  dataPoints = [],
  className,
}) => {
  const { t } = useTranslation()

  const status = useMemo((): ControlStatus => {
    if (current > ucl) return 'breached-ucl'
    if (current < lcl) return 'breached-lcl'
    return 'in-control'
  }, [current, ucl, lcl])

  const trend = useMemo(() => {
    if (dataPoints.length < 2) return null

    const recentPoints = dataPoints.slice(-10)
    const first = recentPoints[0].value
    const last = recentPoints[recentPoints.length - 1].value

    const diff = last - first
    const percentageChange = (diff / first) * 100

    if (Math.abs(percentageChange) < 1) return null
    return diff > 0 ? 'upward' : 'downward'
  }, [dataPoints])

  const distanceFromMean = ((current - mean) / mean) * 100
  const summaryItems = [
    {
      label: t('spc.current'),
      value: current.toFixed(1),
    },
    {
      label: t('spc.mean'),
      value: mean.toFixed(1),
    },
    {
      label: t('spc.ucl'),
      value: ucl.toFixed(1),
    },
    {
      label: t('spc.lcl'),
      value: lcl.toFixed(1),
    },
  ]

  const recommendations = useMemo(() => {
    const baseRecommendations: string[] = []

    if (status === 'breached-ucl') {
      baseRecommendations.push(`${t('spc.immediate')}: ${t('spc.investigatePressureSpike')}`)
      baseRecommendations.push(`${t('spc.high')}: ${t('spc.checkHydraulicSystem')}`)
      baseRecommendations.push(`${t('spc.medium')}: ${t('spc.reviewCycleParameters')}`)
      baseRecommendations.push(`${t('spc.low')}: ${t('spc.monitorFor30Min')}`)
    } else if (status === 'breached-lcl') {
      baseRecommendations.push(`${t('spc.immediate')}: ${t('spc.investigatePressureDrop')}`)
      baseRecommendations.push(`${t('spc.high')}: ${t('spc.checkSensorCalibration')}`)
      baseRecommendations.push(`${t('spc.medium')}: ${t('spc.verifyCycleTiming')}`)
      baseRecommendations.push(`${t('spc.low')}: ${t('spc.monitorFor30Min')}`)
    } else {
      baseRecommendations.push(`${t('spc.medium')}: ${t('spc.monitorProcessStability')}`)
      baseRecommendations.push(`${t('spc.low')}: ${t('spc.reviewTrendsRegularly')}`)
      baseRecommendations.push(`${t('spc.low')}: ${t('spc.checkSigmaMethodUsed')}`)
    }

    if (trend === 'upward' && current > mean) {
      baseRecommendations.push(`${t('spc.note')}: ${t('spc.upwardTrendDetected')}`)
    } else if (trend === 'downward' && current < mean) {
      baseRecommendations.push(`${t('spc.note')}: ${t('spc.downwardTrendDetected')}`)
    }

    return baseRecommendations
  }, [status, trend, current, mean, t])

  const statusConfig = {
    'breached-ucl': {
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'UNSTABLE - Breached UCL',
    },
    'breached-lcl': {
      icon: AlertCircle,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      borderColor: 'border-blue-200',
      label: 'UNSTABLE - Breached LCL',
    },
    'in-control': {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'STABLE - In Control',
    },
    'unknown': {
      icon: AlertCircle,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      borderColor: 'border-gray-200',
      label: 'UNKNOWN',
    },
  }

  const StatusIcon = statusConfig[status].icon
  const statusColor = statusConfig[status].color
  const statusBg = statusConfig[status].bg
  const statusLabel = statusConfig[status].label

  const [open, setOpen] = useState(true)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn('w-full rounded-md overflow-hidden', className)}>
      <CollapsibleTrigger className="group flex w-full flex-col items-start justify-start gap-2 border-b bg-muted/20 px-4 py-3 text-left text-sm whitespace-normal data-[state=open]:bg-muted/30">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${statusColor}`} />
              {trend === 'upward' && (
                <TrendingUp className="h-4 w-4 text-red-500" />
              )}
              {trend === 'downward' && (
                <TrendingDown className="h-4 w-4 text-blue-500" />
              )}
            </div>
            <span className="font-medium">
              {name} ({field}) • {unit}
            </span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusBg} ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[state=open]:rotate-180" />
        </div>
        {!open && (
          <div className="flex w-full flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {summaryItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <span>{item.label}:</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent
        disableAnimation
        className="p-0"
        contentClassName="space-y-4 rounded-md bg-muted/20 p-4"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 font-medium">{t('spc.keyMetrics')}</span>
            <StatusIcon className={`h-4 w-4 ${statusColor}`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-xs text-gray-500">{t('spc.current')}</div>
              <div className={`text-lg font-bold ${statusColor}`}>
                {current.toFixed(1)}
                <span className="text-xs ml-1 text-gray-500">
                  ({distanceFromMean > 0 ? '+' : ''}{distanceFromMean.toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-xs text-gray-500">{t('spc.mean')}</div>
              <div className="text-lg font-bold text-gray-700">{mean.toFixed(1)}</div>
            </div>
            <div className="bg-red-50 p-2 rounded border border-red-100">
              <div className="text-xs text-gray-500">{t('spc.ucl')}</div>
              <div className="text-sm font-bold text-red-600">{ucl.toFixed(1)}</div>
            </div>
            <div className="bg-blue-50 p-2 rounded border border-blue-100">
              <div className="text-xs text-gray-500">{t('spc.lcl')}</div>
              <div className="text-sm font-bold text-blue-600">{lcl.toFixed(1)}</div>
            </div>
          </div>
        </div>

        <div className="border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600 font-medium">{t('spc.sampleStats')}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-50 p-2 rounded text-center">
              <div className="text-gray-500 mb-1">{t('spc.count')}</div>
              <div className="font-bold text-gray-700">{count}</div>
            </div>
            <div className="bg-gray-50 p-2 rounded text-center">
              <div className="text-gray-500 mb-1">{t('spc.stdDev')}</div>
              <div className="font-bold text-gray-700">{stdDev.toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 p-2 rounded text-center">
              <div className="text-gray-500 mb-1">{t('spc.median')}</div>
              <div className="font-bold text-gray-700">{median.toFixed(1)}</div>
            </div>
            <div className="bg-gray-50 p-2 rounded text-center">
              <div className="text-gray-500 mb-1">{t('spc.min')}</div>
              <div className="font-bold text-gray-700">{min.toFixed(1)}</div>
            </div>
            <div className="bg-gray-50 p-2 rounded text-center">
              <div className="text-gray-500 mb-1">{t('spc.max')}</div>
              <div className="font-bold text-gray-700">{max.toFixed(1)}</div>
            </div>
            <div className="bg-gray-50 p-2 rounded text-center">
              <div className="text-gray-500 mb-1">{t('spc.p95')}</div>
              <div className="font-bold text-gray-700">{p95.toFixed(1)}</div>
            </div>
          </div>
        </div>

        <div className="border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600 font-medium">{t('spc.controlLimits')}</span>
            <span className="text-xs text-gray-500">{method}</span>
          </div>

          <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('spc.sigma')}:</span>
              <span className="font-mono text-gray-700">{sigma.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('spc.width')}:</span>
              <span className="font-mono text-gray-700">
                {(ucl - lcl).toFixed(1)} ({((ucl - lcl) / mean * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        <div className="border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600 font-medium">{t('spc.timeWindow')}</span>
          </div>

          <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('spc.start')}:</span>
              <span className="font-mono text-gray-700">
                {new Date(windowStart).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('spc.end')}:</span>
              <span className="font-mono text-gray-700">
                {new Date(windowEnd).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('spc.duration')}:</span>
              <span className="font-mono text-gray-700">
                {Math.round((new Date(windowEnd).getTime() - new Date(windowStart).getTime()) / 1000)}s
              </span>
            </div>
          </div>
        </div>

        <div className="border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600 font-medium">RECOMMENDATIONS</span>
          </div>

          <div className="space-y-1">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`text-xs flex items-start gap-2 ${
                  rec.includes('IMMEDIATE') ? 'text-red-600' :
                  rec.includes('HIGH') ? 'text-orange-600' :
                  rec.includes('MEDIUM') ? 'text-yellow-600' :
                  rec.includes('LOW') ? 'text-gray-600' :
                  'text-blue-600'
                }`}
              >
                <span className="font-medium">{rec.split(':')[0]}:</span>
                <span className="text-gray-700">{rec.split(':')[1]?.trim() || ''}</span>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
