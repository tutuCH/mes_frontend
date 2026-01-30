import type { DataPoint } from '@/hooks/useSPCStreamAggregator'
import type { SpcSeriesStats } from '@/types/api'
import {
  createControlLimitLine,
  createCurrentValueIndicator,
  createDataLine,
  createMedianLine,
  createP95Line,
  createStdDevLine,
} from '@/lib/chartConfig'
import type { ChartData } from '@/lib/chartConfig'

type ControlLimits = {
  ucl: number
  lcl: number
  mean: number
  sigma?: number
}

type BuildParams = {
  data: DataPoint[]
  name: string
  unit: string
  limits: ControlLimits | null
  stats: SpcSeriesStats | null
}

export function buildSpcDatasets({ data, name, unit, limits, stats }: BuildParams) {
  const datasets: ChartData['datasets'] = [
    createDataLine(data, `${name} (${unit})`) as ChartData['datasets'][number]
  ]

  if (!limits) {
    return datasets
  }

  datasets.push(
    createControlLimitLine([], 'rgb(239, 68, 68)', 'UCL', [5, 5]) as ChartData['datasets'][number],
    createControlLimitLine([], 'rgb(239, 68, 68)', 'LCL', [5, 5]) as ChartData['datasets'][number],
    createControlLimitLine([], 'rgb(34, 197, 94)', 'Mean', [3, 3]) as ChartData['datasets'][number]
  )

  if (stats) {
    datasets.push(
      createP95Line([]) as ChartData['datasets'][number],
      createMedianLine([]) as ChartData['datasets'][number]
    )

    if (stats.stdDev !== undefined) {
      datasets.push(
        createStdDevLine([], 'rgb(251, 191, 36)', '+1σ', [2, 4]) as ChartData['datasets'][number],
        createStdDevLine([], 'rgb(251, 191, 36)', '-1σ', [2, 4]) as ChartData['datasets'][number],
        createStdDevLine([], 'rgb(156, 163, 175)', '+2σ', [1, 3]) as ChartData['datasets'][number],
        createStdDevLine([], 'rgb(156, 163, 175)', '-2σ', [1, 3]) as ChartData['datasets'][number]
      )
    }
  }

  if (data.length > 0) {
    const lastPoint = data[data.length - 1]
    datasets.push(
      createCurrentValueIndicator(lastPoint.y, limits.ucl, limits.lcl, lastPoint.x) as ChartData['datasets'][number]
    )
  }

  return datasets
}
