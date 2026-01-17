import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
          <h2 className="text-2xl font-bold tracking-tight">{t('deviceRegistry.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('deviceRegistry.subtitle')}</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('deviceRegistry.addDevice')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>{t('deviceRegistry.registeredDevices')}</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('deviceRegistry.searchPlaceholder')}
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
              <p>{t('deviceRegistry.loadFailed')}</p>
              <Button variant="outline" className="mt-2" onClick={() => dispatch(fetchFactoriesWithMachines())}>
                {t('deviceRegistry.retry')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">{t('deviceRegistry.tableHeaders.id')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('deviceRegistry.tableHeaders.name')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('deviceRegistry.tableHeaders.factory')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('deviceRegistry.tableHeaders.ipAddress')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('deviceRegistry.tableHeaders.status')}</TableHead>
                    <TableHead className="text-right whitespace-nowrap">{t('deviceRegistry.tableHeaders.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMachines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? t('deviceRegistry.noDevicesMatch') : t('deviceRegistry.noDevices')}
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
                            {machine.status || t('deviceRegistry.statusUnknown')}
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
                                {t('deviceRegistry.actions.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(machine)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('deviceRegistry.actions.delete')}
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
            <DialogTitle>{t('deviceRegistry.addDialog.title')}</DialogTitle>
            <DialogDescription>{t('deviceRegistry.addDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="machineName">{t('deviceRegistry.addDialog.deviceName')}</Label>
              <Input
                id="machineName"
                value={formData.machineName}
                onChange={(e) => setFormData({ ...formData, machineName: e.target.value })}
                placeholder={t('deviceRegistry.addDialog.deviceNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machineIndex">{t('deviceRegistry.addDialog.deviceId')}</Label>
              <Input
                id="machineIndex"
                value={formData.machineIndex}
                onChange={(e) => setFormData({ ...formData, machineIndex: e.target.value })}
                placeholder={t('deviceRegistry.addDialog.deviceIdPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machineIpAddress">{t('deviceRegistry.addDialog.ipAddress')}</Label>
              <Input
                id="machineIpAddress"
                value={formData.machineIpAddress}
                onChange={(e) => setFormData({ ...formData, machineIpAddress: e.target.value })}
                placeholder={t('deviceRegistry.addDialog.ipAddressPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="factoryId">{t('deviceRegistry.addDialog.factory')}</Label>
              <Select
                value={formData.factoryId?.toString() || ''}
                onValueChange={(value) => setFormData({ ...formData, factoryId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('deviceRegistry.addDialog.selectFactory')} />
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
              {t('deviceRegistry.addDialog.cancel')}
            </Button>
            <Button
              onClick={handleAddMachine}
              disabled={isSubmitting || !formData.machineName || !formData.machineIpAddress || !formData.factoryId}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('deviceRegistry.addDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Device Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deviceRegistry.editDialog.title')}</DialogTitle>
            <DialogDescription>{t('deviceRegistry.editDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-machineName">{t('deviceRegistry.editDialog.deviceName')}</Label>
              <Input
                id="edit-machineName"
                value={formData.machineName}
                onChange={(e) => setFormData({ ...formData, machineName: e.target.value })}
                placeholder={t('deviceRegistry.editDialog.deviceNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-machineIndex">{t('deviceRegistry.editDialog.deviceId')}</Label>
              <Input
                id="edit-machineIndex"
                value={formData.machineIndex}
                onChange={(e) => setFormData({ ...formData, machineIndex: e.target.value })}
                placeholder={t('deviceRegistry.editDialog.deviceIdPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-machineIpAddress">{t('deviceRegistry.editDialog.ipAddress')}</Label>
              <Input
                id="edit-machineIpAddress"
                value={formData.machineIpAddress}
                onChange={(e) => setFormData({ ...formData, machineIpAddress: e.target.value })}
                placeholder={t('deviceRegistry.editDialog.ipAddressPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('deviceRegistry.editDialog.cancel')}
            </Button>
            <Button onClick={handleEditMachine} disabled={isSubmitting || !formData.machineName}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('deviceRegistry.editDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deviceRegistry.deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('deviceRegistry.deleteDialog.confirm', { name: selectedMachine?.machineName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('deviceRegistry.deleteDialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteMachine} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('deviceRegistry.deleteDialog.confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
