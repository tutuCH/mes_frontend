import { Construction } from 'lucide-react'

interface ComingSoonProps {
  title: string
  description?: string
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] py-8 text-muted-foreground">
      <Construction className="h-12 w-12 mb-4 opacity-50" />
      <p className="text-lg font-medium">{title}</p>
      {description && <p className="text-sm mt-1 opacity-70">{description}</p>}
    </div>
  )
}
