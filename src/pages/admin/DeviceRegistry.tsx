import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Settings } from 'lucide-react'

// Mock Device Data
const devices = [
  { id: 'M-001', name: 'Injection Press 1', type: 'Injection Molding', model: 'Engel e-motion', status: 'active', ip: '192.168.1.101' },
  { id: 'M-002', name: 'Injection Press 2', type: 'Injection Molding', model: 'Arburg Allrounder', status: 'active', ip: '192.168.1.102' },
  { id: 'M-003', name: 'Injection Press 3', type: 'Injection Molding', model: 'Sumitomo SE', status: 'maintenance', ip: '192.168.1.103' },
  { id: 'M-004', name: 'Injection Press 4', type: 'Injection Molding', model: 'Engel e-motion', status: 'active', ip: '192.168.1.104' },
  { id: 'A-001', name: 'Assembly Robot 1', type: 'Robot', model: 'Fanuc M-20', status: 'active', ip: '192.168.1.201' },
]

export default function DeviceRegistry() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Device Registry</h1>
          <p className="text-sm text-muted-foreground">Manage connected machines and IoT gateways</p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Device
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>Registered Devices</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search devices..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">ID</TableHead>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Type</TableHead>
                  <TableHead className="whitespace-nowrap">Model</TableHead>
                  <TableHead className="whitespace-nowrap">IP Address</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-mono">{device.id}</TableCell>
                  <TableCell className="font-medium">{device.name}</TableCell>
                  <TableCell>{device.type}</TableCell>
                  <TableCell>{device.model}</TableCell>
                  <TableCell className="font-mono text-xs">{device.ip}</TableCell>
                  <TableCell>
                    <Badge variant={device.status === 'active' ? 'default' : 'secondary'}>
                      {device.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
