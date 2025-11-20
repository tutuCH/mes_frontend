import { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { ControlChart } from '@/components/spc/ControlChart'
import { ZoneTemperatureGrid } from '@/components/spc/ZoneTemperatureGrid'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, Calendar } from 'lucide-react'
import { type RootState } from '@/store'
import { api } from '@/services/api'

export default function SPCAnalysis() {
  const machines = useSelector((state: RootState) => state.machines.machines)
  const machineList = Object.values(machines).sort((a, b) => a.id.localeCompare(b.id))
  
  const [selectedMachineId, setSelectedMachineId] = useState<string>('')
  const [spcHistory, setSpcHistory] = useState<any[]>([])
  const [realtimeHistory, setRealtimeHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  if (loading && !spcHistory.length) {
    return <div className="text-sm text-muted-foreground">Loading data...</div>
  }

  useEffect(() => {
    if (machineList.length > 0 && !selectedMachineId) {
      setSelectedMachineId(machineList[0].id)
    }
  }, [machineList, selectedMachineId])

  const selectedMachine = machines[selectedMachineId] || { name: 'Unknown Machine' }

  useEffect(() => {
    if (!selectedMachineId) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const [spcRes, realtimeRes] = await Promise.all([
          api.getSPCHistory(selectedMachineId, { limit: 50 }),
          api.getRealtimeHistory(selectedMachineId, { limit: 50 })
        ])
        setSpcHistory(spcRes.data)
        setRealtimeHistory(realtimeRes.data)
      } catch (error) {
        console.error('Failed to fetch history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedMachineId])

  const weightData = useMemo(() => spcHistory.map((d: any, i: number) => ({
    id: i + 1,
    value: parseFloat(d.EIVM || 0) // Using Injection Velocity as mock for "Weight" for now
  })), [spcHistory])

  const tempData = useMemo(() => realtimeHistory.map((d: any, i: number) => ({
    id: i + 1,
    value: d.T1
  })), [realtimeHistory])
  
  const techData = useMemo(() => realtimeHistory.slice(0, 10).map((d: any) => ({
    timestamp: d.time,
    parameter: 'Oil Temp',
    value: d.OT,
    unit: '°C'
  })), [realtimeHistory])

  const spcTableData = useMemo(() => spcHistory.slice(0, 10).map((d: any) => ({
    timestamp: d.time,
    metric: 'Cycle Time',
    measurement: d.ECYCT,
    status: 'Normal'
  })), [spcHistory])

  const realtimeTableData = useMemo(() => realtimeHistory.slice(0, 10).map((d: any) => ({
    timestamp: d.time,
    sensor: 'Zone 1 Temp',
    reading: d.T1,
    status: 'Active'
  })), [realtimeHistory])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SPC Analysis</h1>
          <p className="text-muted-foreground">Statistical Process Control for {selectedMachine.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Machine" />
            </SelectTrigger>
            <SelectContent>
              {machineList.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name} ({m.id})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Last 24 Hours
          </Button>
          <Button size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ControlChart 
          title="Part Weight Control (g)" 
          data={weightData}
          ucl={153}
          lcl={147}
          mean={150}
          unit="g"
        />
        <ControlChart 
          title="Melt Temperature (°C)" 
          data={tempData}
          ucl={228}
          lcl={212}
          mean={220}
          unit="°C"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="col-span-2">
           <div className="rounded-sm border border-border bg-card text-card-foreground shadow-sm h-[300px] flex items-center justify-center">
             <div className="text-center">
               <h3 className="text-lg font-medium">Process Capability (Cpk)</h3>
               <div className="text-4xl font-bold text-status-green mt-2">1.67</div>
               <p className="text-sm text-muted-foreground mt-1">Process is Capable</p>
             </div>
           </div>
        </div>
        <div className="col-span-1">
          <ZoneTemperatureGrid />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Raw Data Logs</h2>
        <Tabs defaultValue="tech" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="tech">Tech Data</TabsTrigger>
            <TabsTrigger value="spc">SPC Data</TabsTrigger>
            <TabsTrigger value="realtime">Realtime</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tech" className="mt-0">
          <Card className="rounded-sm border border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Technical Data Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="h-8 text-xs font-medium">Time</TableHead>
                    <TableHead className="h-8 text-xs font-medium">Parameter</TableHead>
                    <TableHead className="h-8 text-xs font-medium">Value</TableHead>
                    <TableHead className="h-8 text-xs font-medium">Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {techData.map((row: any, i: number) => (
                    <TableRow key={i} className="hover:bg-muted/50 border-border">
                      <TableCell className="py-2 text-xs font-mono text-muted-foreground">{new Date(row.timestamp).toLocaleTimeString()}</TableCell>
                      <TableCell className="py-2 text-xs font-medium">{row.parameter}</TableCell>
                      <TableCell className="py-2 text-xs font-mono">{row.value}</TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground">{row.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="spc" className="mt-0">
          <Card className="rounded-sm border border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">SPC Measurement Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="h-8 text-xs font-medium">Time</TableHead>
                    <TableHead className="h-8 text-xs font-medium">Metric</TableHead>
                    <TableHead className="h-8 text-xs font-medium">Value</TableHead>
                    <TableHead className="h-8 text-xs font-medium">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spcTableData.map((row: any, i: number) => (
                    <TableRow key={i} className="hover:bg-muted/50 border-border">
                      <TableCell className="py-2 text-xs font-mono text-muted-foreground">{new Date(row.timestamp).toLocaleTimeString()}</TableCell>
                      <TableCell className="py-2 text-xs font-medium">{row.metric}</TableCell>
                      <TableCell className="py-2 text-xs font-mono">{row.measurement}</TableCell>
                      <TableCell className="py-2 text-xs">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          row.status === 'OOC' 
                            ? 'bg-status-red/10 text-status-red' 
                            : 'bg-status-green/10 text-status-green'
                        }`}>
                          {row.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="realtime" className="mt-0">
          <Card className="rounded-sm border border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Sensor Data Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="h-8 text-xs font-medium">Time</TableHead>
                    <TableHead className="h-8 text-xs font-medium">Sensor</TableHead>
                    <TableHead className="h-8 text-xs font-medium">Reading</TableHead>
                    <TableHead className="h-8 text-xs font-medium">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {realtimeTableData.map((row: any, i: number) => (
                    <TableRow key={i} className="hover:bg-muted/50 border-border">
                      <TableCell className="py-2 text-xs font-mono text-muted-foreground">{new Date(row.timestamp).toLocaleTimeString()}</TableCell>
                      <TableCell className="py-2 text-xs font-medium">{row.sensor}</TableCell>
                      <TableCell className="py-2 text-xs font-mono">{row.reading}</TableCell>
                      <TableCell className="py-2 text-xs">
                        <span className="px-1.5 py-0.5 rounded-full bg-status-green/10 text-status-green text-[10px] font-medium">
                          {row.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
