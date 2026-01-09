import * as XLSX from 'xlsx'

// Calculate statistics for a single field
function calculateFieldStatistics(data: any[], field: string) {
  const values = data
    .map(d => d[field])
    .filter(v => v !== undefined && v !== null && !isNaN(Number(v)))
    .map(Number)

  if (values.length === 0) {
    return { count: 0, mean: 0, min: 0, max: 0, stdDev: 0 }
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const min = Math.min(...values)
  const max = Math.max(...values)
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  return {
    count: values.length,
    mean: mean.toFixed(2),
    min: min.toFixed(2),
    max: max.toFixed(2),
    stdDev: stdDev.toFixed(2)
  }
}

// Generate summary statistics for all metrics
function generateSummaryStatistics(spcHistory: any[], realtimeHistory: any[]) {
  const summary: any[] = []

  // SPC metrics
  const spcFields = [
    { field: 'cycle_number', name: 'Cycle Number' },
    { field: 'cycle_time', name: 'Cycle Time (s)' },
    { field: 'injection_velocity_max', name: 'Injection Velocity Max (mm/s)' },
    { field: 'injection_pressure_max', name: 'Injection Pressure Max (bar)' },
    { field: 'switch_pack_time', name: 'Switch Pack Time (s)' },
    { field: 'switch_pack_pressure', name: 'Switch Pack Pressure (bar)' },
    { field: 'switch_pack_position', name: 'Switch Pack Position (mm)' },
    { field: 'injection_time', name: 'Injection Time (s)' },
    { field: 'plasticizing_time', name: 'Plasticizing Time (s)' },
    { field: 'plasticizing_pressure_max', name: 'Plasticizing Pressure Max (bar)' },
    { field: 'temp_1', name: 'Zone 1 Temp (°C)' },
    { field: 'temp_2', name: 'Zone 2 Temp (°C)' },
    { field: 'temp_3', name: 'Zone 3 Temp (°C)' },
    { field: 'temp_4', name: 'Zone 4 Temp (°C)' },
    { field: 'temp_5', name: 'Zone 5 Temp (°C)' },
    { field: 'temp_6', name: 'Zone 6 Temp (°C)' },
    { field: 'temp_7', name: 'Zone 7 Temp (°C)' },
    { field: 'temp_8', name: 'Zone 8 Temp (°C)' },
    { field: 'temp_9', name: 'Zone 9 Temp (°C)' },
    { field: 'temp_10', name: 'Zone 10 Temp (°C)' }
  ]

  spcFields.forEach(({ field, name }) => {
    const stats = calculateFieldStatistics(spcHistory, field)
    summary.push({
      Metric: name,
      'Data Points': stats.count,
      Mean: stats.mean,
      Min: stats.min,
      Max: stats.max,
      'Std Dev': stats.stdDev
    })
  })

  // Realtime metrics
  const realtimeFields = [
    { field: 'oil_temp', name: 'Oil Temperature (°C)' },
    { field: 'temp_1', name: 'Zone 1 Temp (°C)' },
    { field: 'temp_2', name: 'Zone 2 Temp (°C)' },
    { field: 'temp_3', name: 'Zone 3 Temp (°C)' },
    { field: 'temp_4', name: 'Zone 4 Temp (°C)' },
    { field: 'temp_5', name: 'Zone 5 Temp (°C)' },
    { field: 'temp_6', name: 'Zone 6 Temp (°C)' },
    { field: 'temp_7', name: 'Zone 7 Temp (°C)' },
    { field: 'pressure', name: 'Pressure (bar)' },
    { field: 'cycle_time', name: 'Cycle Time (s)' },
    { field: 'status', name: 'Status' },
    { field: 'operate_mode', name: 'Operation Mode' },
    { field: 'auto_start', name: 'Auto Start' }
  ]

  realtimeFields.forEach(({ field, name }) => {
    const stats = calculateFieldStatistics(realtimeHistory, field)
    summary.push({
      Metric: name,
      'Data Points': stats.count,
      Mean: stats.mean,
      Min: stats.min,
      Max: stats.max,
      'Std Dev': stats.stdDev
    })
  })

  return summary
}

export function exportSPCDataToExcel(
  spcHistory: any[],
  realtimeHistory: any[],
  machineName: string
) {
  // Create workbook
  const wb = XLSX.utils.book_new()

  // 1. SPC Data worksheet (only if data exists)
  if (spcHistory && spcHistory.length > 0) {
    const spcData = spcHistory.map(d => ({
      Timestamp: d._time || d.time,
      Cycle_Number: d.cycle_number,
      Cycle_Time: d.cycle_time,
      Injection_Velocity_Max: d.injection_velocity_max,
      Injection_Pressure_Max: d.injection_pressure_max,
      Switch_Pack_Time: d.switch_pack_time,
      Switch_Pack_Pressure: d.switch_pack_pressure,
      Switch_Pack_Position: d.switch_pack_position,
      Injection_Time: d.injection_time,
      Plasticizing_Time: d.plasticizing_time,
      Plasticizing_Pressure_Max: d.plasticizing_pressure_max,
      Temp_1: d.temp_1,
      Temp_2: d.temp_2,
      Temp_3: d.temp_3,
      Temp_4: d.temp_4,
      Temp_5: d.temp_5,
      Temp_6: d.temp_6,
      Temp_7: d.temp_7,
      Temp_8: d.temp_8,
      Temp_9: d.temp_9,
      Temp_10: d.temp_10
    }))

    const wsSPC = XLSX.utils.json_to_sheet(spcData)
    XLSX.utils.book_append_sheet(wb, wsSPC, "SPC Data")
  }

  // 2. Realtime Data worksheet (only if data exists)
  if (realtimeHistory && realtimeHistory.length > 0) {
    const realtimeData = realtimeHistory.map(d => ({
      Timestamp: d._time || d.time,
      Oil_Temp: d.oil_temp,
      Temp_1: d.temp_1,
      Temp_2: d.temp_2,
      Temp_3: d.temp_3,
      Temp_4: d.temp_4,
      Temp_5: d.temp_5,
      Temp_6: d.temp_6,
      Temp_7: d.temp_7,
      Pressure: d.pressure,
      Cycle_Time: d.cycle_time,
      Status: d.status,
      Operation_Mode: d.operate_mode,
      Auto_Start: d.auto_start
    }))

    const wsRealtime = XLSX.utils.json_to_sheet(realtimeData)
    XLSX.utils.book_append_sheet(wb, wsRealtime, "Realtime Data")
  }

  // 3. Summary Statistics worksheet (only if we have data from either source)
  if ((spcHistory && spcHistory.length > 0) || (realtimeHistory && realtimeHistory.length > 0)) {
    const summary = generateSummaryStatistics(spcHistory || [], realtimeHistory || [])
    const wsSummary = XLSX.utils.json_to_sheet(summary)
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary")
  }

  // Generate filename with timestamp
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '-')
  const filename = `${machineName}_SPC_Report_${dateStr}_${timeStr}.xlsx`

  // Download file
  XLSX.writeFile(wb, filename)

  return filename
}
