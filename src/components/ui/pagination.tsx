import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  showTotal?: boolean
  totalRecords?: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showTotal = true,
  totalRecords,
}: PaginationProps) {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  const startRecord = totalRecords ? (currentPage - 1) * 10 + 1 : null
  const endRecord = totalRecords ? Math.min(currentPage * 10, totalRecords) : null

  return (
    <div className={cn("flex items-center justify-between", className)}>
      {showTotal && (
        <span className="text-xs text-muted-foreground">
          {totalRecords !== undefined
            ? `Showing ${startRecord}-${endRecord} of ${totalRecords} records`
            : `Page ${currentPage} of ${totalPages}`}
        </span>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="h-8 px-3"
        >
          <ChevronLeft className="h-3 w-3" />
          Previous
        </Button>
        <span className="text-xs text-muted-foreground min-w-[60px] text-center">
          {currentPage} / {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="h-8 px-3"
        >
          Next
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
