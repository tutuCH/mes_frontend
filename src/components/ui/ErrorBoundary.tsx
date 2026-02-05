import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { createLogger } from '@/utils/logger'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  private logger = createLogger('ErrorBoundary')

  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.logger.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh safe-area-padding flex items-center justify-center bg-slate-950 text-white p-4">
          <div className="max-w-md w-full bg-slate-900 border border-red-900/50 rounded-lg p-8 text-center shadow-2xl">
            <div className="mx-auto h-16 w-16 bg-red-900/20 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-red-500">System Error</h1>
            <p className="text-slate-400 mb-6">
              An unexpected error occurred in the dashboard application. Our engineering team has been notified.
            </p>
            <div className="bg-slate-950 p-4 rounded border border-slate-800 text-left mb-6 overflow-auto max-h-32">
              <code className="text-xs text-red-400 font-mono">
                {this.state.error?.message}
              </code>
            </div>
            <div className="flex gap-4 justify-center">
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="border-slate-700 hover:bg-slate-800 hover:text-white"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload System
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
