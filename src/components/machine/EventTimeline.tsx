import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Event {
  time: string
  type: string
  message: string
  severity: 'high' | 'info' | 'success' | 'warning'
}

interface EventTimelineProps {
  events: Event[]
}

export function EventTimeline({ events }: EventTimelineProps) {
  return (
    <Card className="col-span-3 h-full">
      <CardHeader>
        <CardTitle>Event Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No events recorded
              </div>
            ) : (
              events.map((event, i) => (
                <div key={i} className="flex gap-4 border-b pb-4 last:border-0">
                  <div className="text-sm font-mono text-muted-foreground w-16 shrink-0">
                    {event.time}
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${
                      event.severity === 'high' ? 'text-red-500' : 
                      event.severity === 'success' ? 'text-green-500' : 'text-slate-700'
                    }`}>
                      {event.type}
                    </div>
                    <div className="text-sm text-slate-600">{event.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
