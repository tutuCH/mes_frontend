import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Search, Settings, Loader2, Trash2, Edit } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type AppDispatch, type RootState } from '@/store'
import { fetchFactoriesWithMachines } from '@/store/slices/factorySlice'
import { api } from '@/services/api'
import type { Machine, CreateMachineRequest, UpdateMachineRequest, Factory } from '@/types/api'

export function DevicesSettingsTab() {
  const dispatch = useDispatch<AppDispatch>()
  const { factories, loading, error } = useSelector((state: RootState) => state.factories)

  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [formData, setFormData] = useState<CreateMachineRequest>({
    machineName: '',
    machineIpAddress: '',
    machineIndex: '',
    factoryId: 0,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    dispatch(fetchFactoriesWithMachines())
  }, [dispatch])

  // Flatten machines from all factories
  const machines = useMemo(() => {
    const allMachines: (Machine & { factoryName: string })[] = []
    factories.forEach((factory: Factory) => {
      if (factory.machines) {
        factory.machines.forEach((machine: Machine) => {
          allMachines.push({
            ...machine,
            factoryName: factory.factoryName,
          })
        })
      }
    })
    return allMachines
  }, [factories])

  // Filter machines based on search query
  const filteredMachines = useMemo(() => {
    if (!searchQuery) return machines
    const query = searchQuery.toLowerCase()
    return machines.filter(
      (machine) =>
        machine.machineName.toLowerCase().includes(query) ||
        machine.machineIpAddress.toLowerCase().includes(query) ||
        machine.machineIndex.toLowerCase().includes(query) ||
        machine.factoryName.toLowerCase().includes(query)
    )
  }, [machines, searchQuery])

  const handleAddMachine = async () => {
    setIsSubmitting(true)
    try {
      await api.createMachine(formData)
      setIsAddDialogOpen(false)
      setFormData({ machineName: '', machineIpAddress: '', machineIndex: '', factoryId: 0 })
      dispatch(fetchFactoriesWithMachines())
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditMachine = async () => {
    if (!selectedMachine) return
    setIsSubmitting(true)
    try {
      const updateData: UpdateMachineRequest = {
        machineName: formData.machineName,
        machineIpAddress: formData.machineIpAddress,
        machineIndex: formData.machineIndex,
      }
      await api.updateMachine(selectedMachine.machineId, updateData)
      setIsEditDialogOpen(false)
      setSelectedMachine(null)
      dispatch(fetchFactoriesWithMachines())
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteMachine = async () => {
    if (!selectedMachine) return
    setIsSubmitting(true)
    try {
      await api.deleteMachine(selectedMachine.machineId)
      setIsDeleteDialogOpen(false)
      setSelectedMachine(null)
      dispatch(fetchFactoriesWithMachines())
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (machine: Machine & { factoryName: string }) => {
    setSelectedMachine(machine)
    setFormData({
      machineName: machine.machineName,
      machineIpAddress: machine.machineIpAddress,
      machineIndex: machine.machineIndex,
      factoryId: machine.factoryId || 0,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (machine: Machine) => {
    setSelectedMachine(machine)
    setIsDeleteDialogOpen(true)
  }

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running':
      case 'active':
        return 'default'
      case 'idle':
        return 'secondary'
      case 'maintenance':
        return 'outline'
      case 'error':
      case 'stopped':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Device Registry</h2>
          <p className="text-sm text-muted-foreground">Manage connected machines and IoT gateways</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsAddDialogOpen(true)}>
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
              <Input
                placeholder="Search devices..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && machines.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <p>Failed to load devices</p>
              <Button variant="outline" className="mt-2" onClick={() => dispatch(fetchFactoriesWithMachines())}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">ID</TableHead>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap">Factory</TableHead>
                    <TableHead className="whitespace-nowrap">IP Address</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMachines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? 'No devices match your search' : 'No devices found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMachines.map((machine) => (
                      <TableRow key={machine.machineId}>
                        <TableCell className="font-mono">{machine.machineIndex}</TableCell>
                        <TableCell className="font-medium">{machine.machineName}</TableCell>
                        <TableCell>{machine.factoryName}</TableCell>
                        <TableCell className="font-mono text-xs">{machine.machineIpAddress}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(machine.status)}>
                            {machine.status || 'unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(machine)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(machine)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Device Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Device</DialogTitle>
            <DialogDescription>Register a new machine or IoT device.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="machineName">Device Name</Label>
              <Input
                id="machineName"
                value={formData.machineName}
                onChange={(e) => setFormData({ ...formData, machineName: e.target.value })}
                placeholder="Enter device name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machineIndex">Device ID</Label>
              <Input
                id="machineIndex"
                value={formData.machineIndex}
                onChange={(e) => setFormData({ ...formData, machineIndex: e.target.value })}
                placeholder="e.g., M-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machineIpAddress">IP Address</Label>
              <Input
                id="machineIpAddress"
                value={formData.machineIpAddress}
                onChange={(e) => setFormData({ ...formData, machineIpAddress: e.target.value })}
                placeholder="e.g., 192.168.1.101"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="factoryId">Factory</Label>
              <Select
                value={formData.factoryId?.toString() || ''}
                onValueChange={(value) => setFormData({ ...formData, factoryId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select factory" />
                </SelectTrigger>
                <SelectContent>
                  {factories.map((factory: Factory) => (
                    <SelectItem key={factory.factoryId} value={factory.factoryId.toString()}>
                      {factory.factoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMachine}
              disabled={isSubmitting || !formData.machineName || !formData.machineIpAddress || !formData.factoryId}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Device Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>Update device information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-machineName">Device Name</Label>
              <Input
                id="edit-machineName"
                value={formData.machineName}
                onChange={(e) => setFormData({ ...formData, machineName: e.target.value })}
                placeholder="Enter device name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-machineIndex">Device ID</Label>
              <Input
                id="edit-machineIndex"
                value={formData.machineIndex}
                onChange={(e) => setFormData({ ...formData, machineIndex: e.target.value })}
                placeholder="e.g., M-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-machineIpAddress">IP Address</Label>
              <Input
                id="edit-machineIpAddress"
                value={formData.machineIpAddress}
                onChange={(e) => setFormData({ ...formData, machineIpAddress: e.target.value })}
                placeholder="e.g., 192.168.1.101"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditMachine} disabled={isSubmitting || !formData.machineName}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Device</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedMachine?.machineName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMachine} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
