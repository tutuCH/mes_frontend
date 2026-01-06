import { useEffect, useState } from 'react'
import { fetchIoTMessages } from '@/services/iotService'
import type { ParsedIoTMessage } from '@/types/iot'
import { IoTMessageTable } from '@/components/iot/IoTMessageTable'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { AlertTriangle } from 'lucide-react'

export default function IoTData() {
  const [data, setData] = useState<ParsedIoTMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const messages = await fetchIoTMessages()
        // Sort by timestamp descending
        const sortedMessages = messages.sort((a, b) => 
          new Date(b.ts).getTime() - new Date(a.ts).getTime()
        )
        setData(sortedMessages)
      } catch (err) {
        console.error(err)
        setError('Failed to load IoT messages. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold">Error Loading Data</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IoT Data Explorer</h1>
          <p className="text-muted-foreground mt-1">
            View and analyze raw IoT messages from the factory floor.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <IoTMessageTable data={data} />
    </div>
  )
}
