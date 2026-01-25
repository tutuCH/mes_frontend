/**
 * Chart.js Configuration for SPC Charts
 * Optimized for real-time performance and professional appearance
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  type ChartOptions as ChartJSOptions,
  type ChartData as ChartJSData,
} from 'chart.js'
import 'chartjs-adapter-date-fns'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
)

export { ChartJS }
export type ChartOptions = ChartJSOptions<'line'>
export type ChartData = ChartJSData<'line'>

/**
 * Default chart options optimized for SPC charts
 */
export const defaultChartOptions: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false, // Disable animations for better performance
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        boxWidth: 12,
        padding: 10,
        font: {
          size: 11,
        },
      },
    },
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFont: {
        size: 12,
      },
      bodyFont: {
        size: 11,
      },
      padding: 8,
      displayColors: true,
      callbacks: {
        label: function (context) {
          const label = context.dataset.label || ''
          const value = context.parsed.y
          if (value === null) return `${label}: N/A`
          return `${label}: ${value.toFixed(2)}`
        },
      },
    },
  },
  scales: {
    x: {
      type: 'time',
      time: {
        displayFormats: {
          second: 'HH:mm:ss',
          minute: 'HH:mm',
          hour: 'HH:mm',
        },
      },
      ticks: {
        maxRotation: 0,
        autoSkipPadding: 20,
        font: {
          size: 10,
        },
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.05)',
      },
    },
    y: {
      beginAtZero: false,
      ticks: {
        font: {
          size: 10,
        },
        callback: function (value) {
          return typeof value === 'number' ? value.toFixed(1) : value
        },
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.05)',
      },
    },
  },
}

/**
 * Create SPC control limit line configuration
 */
export function createControlLimitLine(
  data: Array<{ x: number; y: number }>,
  color: string,
  label: string,
  borderDash: number[] = [5, 5]
) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderDash,
    pointRadius: 0,
    pointHoverRadius: 0,
    fill: false,
    parsing: false as const, // Disable parsing for consistency
  }
}

/**
 * Create main data line configuration
 */
export function createDataLine(
  data: Array<{ x: number; y: number }>,
  label: string
) {
  return {
    label,
    data,
    borderColor: 'rgb(59, 130, 246)', // blue-500
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 2,
    pointRadius: 2,
    pointHoverRadius: 4,
    pointBackgroundColor: 'rgb(59, 130, 246)',
    fill: false,
    tension: 0.1,
    parsing: false as const, // Disable parsing to prevent Chart.js from reordering data
  }
}
