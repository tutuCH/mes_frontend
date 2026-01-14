import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download, Loader2 } from 'lucide-react';
import { useAlarms } from '@/hooks/useAlarms';
import { formatLocaleString } from '@/utils/dateUtils';
import { type RootState } from '@/store';

export default function AlarmList() {
  const { t } = useTranslation()
  const machines = useSelector((state: RootState) => state.machines.machines);
  const machineList = Object.values(machines);

  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Default to first machine
  useEffect(() => {
    if (machineList.length > 0 && !selectedMachineId) {
      setSelectedMachineId(machineList[0].id);
    }
  }, [machineList, selectedMachineId]);

  // Fetch alarms for selected machine
  const { alarms, loading } = useAlarms({ machineId: selectedMachineId, timeRange: '-24h' });

  // Filter alarms
  const filteredAlarms = useMemo(() => {
    return alarms.filter(alarm => {
      const matchesSearch =
        alarm.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alarm.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alarm.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSeverity = severityFilter === 'all' || alarm.severity === severityFilter;
      const matchesStatus = statusFilter === 'all' || alarm.status === statusFilter;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [alarms, searchTerm, severityFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('alarms.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('alarms.subtitle')}
            {selectedMachineId && ` - ${t('machine.machine')} ${selectedMachineId}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 sm:flex-initial">
            <Download className="mr-2 h-4 w-4" />
            {t('alarms.exportHistory')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>{t('alarms.activeRecent')}</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder={t('factory.filterMachine')} />
                </SelectTrigger>
                <SelectContent>
                  {machineList.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('alarms.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder={t('alarms.severity')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('alarms.statusAll')}</SelectItem>
                  <SelectItem value="critical">{t('alarms.severityCritical')}</SelectItem>
                  <SelectItem value="warning">{t('alarms.severityWarning')}</SelectItem>
                  <SelectItem value="info">{t('alarms.severityInfo')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder={t('alarms.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('alarms.statusAll')}</SelectItem>
                  <SelectItem value="active">{t('alarms.statusActive')}</SelectItem>
                  <SelectItem value="acknowledged">{t('alarms.statusAcknowledged')}</SelectItem>
                  <SelectItem value="resolved">{t('alarms.statusResolved')}</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && alarms.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('alarms.tableHeaders.time')}</TableHead>
                  <TableHead>{t('alarms.tableHeaders.machine')}</TableHead>
                  <TableHead>{t('alarms.tableHeaders.message')}</TableHead>
                  <TableHead>{t('alarms.tableHeaders.severity')}</TableHead>
                  <TableHead>{t('alarms.tableHeaders.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlarms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {loading ? t('alarms.loading') : t('alarms.noAlarms')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAlarms.map((alarm) => (
                    <TableRow key={`${alarm.id}-${alarm.timestamp}`}>
                      <TableCell className="font-mono text-xs">
                        {formatLocaleString(alarm.timestamp, '--')}
                      </TableCell>
                      <TableCell>{alarm.deviceId}</TableCell>
                      <TableCell>{alarm.message}</TableCell>
                      <TableCell>
                        <Badge variant={
                          alarm.severity === 'critical' ? 'destructive' :
                          alarm.severity === 'warning' ? 'secondary' : 'outline'
                        }>
                          {alarm.severity === 'critical' && t('alarms.severityCritical')}
                          {alarm.severity === 'warning' && t('alarms.severityWarning')}
                          {alarm.severity === 'info' && t('alarms.severityInfo')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium uppercase ${
                          alarm.status === 'active' ? 'text-red-500 animate-pulse' :
                          alarm.status === 'acknowledged' ? 'text-yellow-500' :
                          'text-slate-500'
                        }`}>
                          {alarm.status === 'active' && t('alarms.statusActive')}
                          {alarm.status === 'acknowledged' && t('alarms.statusAcknowledged')}
                          {alarm.status === 'resolved' && t('alarms.statusResolved')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
