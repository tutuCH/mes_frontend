import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSPCFieldLabel, getSPCFieldUnit } from '@/utils/fieldMapping'
import type { SPCDataPoint } from '@/types/api'

interface SPCFieldsGridProps {
  data: SPCDataPoint | null
  title?: string
}

// Define field groups for organized display
const FIELD_GROUPS = {
  'Cycle Metrics': ['cycle_number', 'cycle_time'],
  'Injection Metrics': [
    'injection_velocity_max',
    'injection_pressure_max',
    'injection_time',
  ],
  'Pack/Hold Metrics': [
    'switch_pack_time',
    'switch_pack_pressure',
    'switch_pack_position',
  ],
  'Plasticizing Metrics': [
    'plasticizing_time',
    'plasticizing_pressure_max',
  ],
  'Temperature Zones': [
    'temp_1', 'temp_2', 'temp_3', 'temp_4', 'temp_5',
    'temp_6', 'temp_7', 'temp_8', 'temp_9', 'temp_10',
  ],
}

export function SPCFieldsGrid({ data, title = 'SPC Metrics' }: SPCFieldsGridProps) {
  if (!data) {
    return (
      <Card className="muji-card shadow-none">
        <CardHeader>
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No SPC data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="muji-card shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(FIELD_GROUPS).map(([groupName, fields]) => {
          // Filter to only fields that have values
          const availableFields = fields.filter(field => {
            const value = data[field as keyof SPCDataPoint]
            return value !== undefined && value !== null
          })

          if (availableFields.length === 0) return null

          return (
            <div key={groupName}>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {groupName}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availableFields.map(field => {
                  const value = data[field as keyof SPCDataPoint]
                  const label = getSPCFieldLabel(field)
                  const unit = getSPCFieldUnit(field)

                  return (
                    <div
                      key={field}
                      className="p-3 rounded-sm bg-secondary/50 border border-border"
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        {label}
                      </div>
                      <div className="text-lg font-mono font-semibold">
                        {typeof value === 'number' ? value.toFixed(2) : value}
                        {unit && <span className="text-xs ml-1">{unit}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
