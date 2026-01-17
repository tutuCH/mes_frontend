import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ParsedIoTMessage } from '@/types/iot'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Search, Clock, Database, Tag } from 'lucide-react'
import { formatLocaleString } from '@/utils/dateUtils'

interface IoTMessageTableProps {
  data: ParsedIoTMessage[]
}

export function IoTMessageTable({ data }: IoTMessageTableProps) {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Extract unique message types for tabs
  const msgTypes = useMemo(() => {
    const types = new Set(data.map((msg) => msg.msgType))
    return ['all', ...Array.from(types).sort()]
  }, [data])

  // Filter data based on search term and selected tab
  const filteredData = useMemo(() => {
    return data.filter((msg) => {
      const matchesSearch =
        msg.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(msg.payload).toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesTab = selectedTab === 'all' || msg.msgType === selectedTab

      return matchesSearch && matchesTab
    })
  }, [data, searchTerm, selectedTab])

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredData, currentPage])

  // Reset page when filter changes
  useMemo(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedTab])

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'realtime':
        return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
      case 'spc':
        return 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
      case 'wm':
        return 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('iotMessageLog.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {t('iotMessageLog.showingMessages', { count: filteredData.length })}
        </div>
      </div>

      <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="mb-4 flex flex-wrap h-auto gap-2 bg-transparent p-0 justify-start">
          {msgTypes.map((type) => (
            <TabsTrigger
              key={type}
              value={type}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground capitalize border border-border bg-card"
            >
              {type}
            </TabsTrigger>
          ))}
        </TabsList>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              {t('iotMessageLog.title')}
            </CardTitle>
            <CardDescription>
              {t('iotMessageLog.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px] whitespace-nowrap">{t('iotMessageLog.tableHeaders.timestamp')}</TableHead>
                    <TableHead className="min-w-[100px] whitespace-nowrap">{t('iotMessageLog.tableHeaders.deviceId')}</TableHead>
                    <TableHead className="min-w-[80px] whitespace-nowrap">{t('iotMessageLog.tableHeaders.type')}</TableHead>
                    <TableHead className="min-w-[150px] whitespace-nowrap">{t('iotMessageLog.tableHeaders.topic')}</TableHead>
                    <TableHead className="min-w-[200px]">{t('iotMessageLog.tableHeaders.payload')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((msg, index) => (
                      <TableRow key={index} className="group hover:bg-muted/50">
                        <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {formatLocaleString(msg.payload._time, '--')}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{msg.payload.device_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`capitalize ${getBadgeColor(msg.msgType)} border-0`}>
                            {msg.msgType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Tag className="h-3 w-3" />
                            {msg.topic}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ScrollArea className="h-[80px] w-full rounded-md border bg-muted/50 p-2">
                            <pre className="text-[10px] leading-tight font-mono text-muted-foreground">
                              {JSON.stringify(msg.payload, null, 2)}
                            </pre>
                          </ScrollArea>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        {t('iotMessageLog.noResults')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {filteredData.length > 0 && (
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
              {t('iotMessageLog.pagination.pageOf', { current: currentPage, total: totalPages })}
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                {t('iotMessageLog.pagination.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                {t('iotMessageLog.pagination.next')}
              </Button>
            </div>
          </div>
        )}
      </Tabs>
    </div>
  )
}
