import { useEffect, useRef } from 'react'
import { ChartJS, defaultChartOptions } from '@/lib/chartConfig'

interface InventoryLineChartProps {
  points: Array<{ timestamp: string; consumedKg: number }>
  label?: string
  testId?: string
  className?: string
}

export function InventoryLineChart({
  points,
  label = 'Consumption',
  testId = 'inventory-line-chart',
  className = 'h-64',
}: InventoryLineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef = useRef<ChartJS<'line'> | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const existingChart = ChartJS.getChart?.(canvasRef.current)
    if (existingChart) {
      existingChart.destroy()
    }

    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    const data = {
      datasets: [
        {
          label,
          data: points.map(point => ({ x: point.timestamp, y: point.consumedKg })),
          borderColor: 'rgba(14, 165, 233, 1)',
          backgroundColor: 'rgba(14, 165, 233, 0.2)',
          tension: 0.3,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          parsing: false as const,
        },
      ],
    }

    chartRef.current = new ChartJS(ctx, {
      type: 'line',
      data,
      options: {
        ...defaultChartOptions,
        scales: {
          ...defaultChartOptions.scales,
          y: {
            ...defaultChartOptions.scales?.y,
            beginAtZero: true,
          },
        },
      },
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [points, label])

  return (
    <div className={className}>
      <canvas ref={canvasRef} data-testid={testId} />
    </div>
  )
}
