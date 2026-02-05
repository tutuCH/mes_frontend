import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(DoughnutController, ArcElement, Tooltip, Legend)

interface InventoryDoughnutChartProps {
  labels: string[]
  data: number[]
  testId?: string
  className?: string
}

export function InventoryDoughnutChart({
  labels,
  data,
  testId = 'inventory-doughnut-chart',
  className = 'h-64',
}: InventoryDoughnutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef = useRef<ChartJS<'doughnut'> | null>(null)

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

    chartRef.current = new ChartJS(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              'rgba(16, 185, 129, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(239, 68, 68, 0.8)',
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { size: 11 },
            },
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
  }, [labels, data])

  return (
    <div className={className}>
      <canvas ref={canvasRef} data-testid={testId} />
    </div>
  )
}
