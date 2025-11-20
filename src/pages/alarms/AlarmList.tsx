import { AlarmPareto } from '@/components/alarms/AlarmPareto'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter, Download } from 'lucide-react'

// Mock Alarm Data
const alarms = [
  { id: 1, time: '10:45:22', machine: 'M-001', message: 'Mold Protection Error', severity: 'critical', status: 'active' },
  { id: 2, time: '10:30:15', machine: 'M-003', message: 'Barrel Temp High', severity: 'warning', status: 'active' },
  { id: 3, time: '09:15:00', machine: 'M-008', message: 'Oil Pressure Low', severity: 'critical', status: 'acknowledged' },
  { id: 4, time: '08:45:10', machine: 'M-002', message: 'Safety Door Open', severity: 'info', status: 'resolved' },
  { id: 5, time: '08:30:00', machine: 'M-005', message: 'Cycle Time Deviation', severity: 'warning', status: 'resolved' },
]

export default function AlarmList() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alarms & Events</h1>
          <p className="text-muted-foreground">Real-time alarm monitoring and history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export History
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="col-span-1">
          <AlarmPareto />
        </div>
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active & Recent Alarms</CardTitle>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search alarms..." className="pl-8" />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alarms.map((alarm) => (
                  <TableRow key={alarm.id}>
                    <TableCell className="font-mono">{alarm.time}</TableCell>
                    <TableCell>{alarm.machine}</TableCell>
                    <TableCell>{alarm.message}</TableCell>
                    <TableCell>
                      <Badge variant={
                        alarm.severity === 'critical' ? 'destructive' : 
                        alarm.severity === 'warning' ? 'secondary' : 'outline' // Changed 'warning' to 'secondary' as 'warning' isn't standard shadcn
                      }>
                        {alarm.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium uppercase ${
                        alarm.status === 'active' ? 'text-red-500 animate-pulse' : 'text-slate-500'
                      }`}>
                        {alarm.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
