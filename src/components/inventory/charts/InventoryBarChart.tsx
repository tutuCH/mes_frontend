import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

interface InventoryBarChartProps {
  labels: string[]
  datasets: Array<{ label: string; data: number[]; backgroundColor?: string }>
  testId?: string
  className?: string
}

export function InventoryBarChart({
  labels,
  datasets,
  testId = 'inventory-bar-chart',
  className = 'h-64',
}: InventoryBarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef = useRef<ChartJS<'bar'> | null>(null)

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
      type: 'bar',
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              font: { size: 11 },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } },
          },
          y: {
            beginAtZero: true,
            ticks: { font: { size: 10 } },
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
  }, [labels, datasets])

  return (
    <div className={className}>
      <canvas ref={canvasRef} data-testid={testId} />
    </div>
  )
}
