import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { queryClient } from '@/lib/queryClient';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  autoReset?: boolean; // Automatically try to recover without reload
  resetTimeout?: number; // Time in ms before auto-reset (if enabled)
  resetSoft?: boolean; // Reset query cache only instead of full page reload
  onError?: (error: Error, errorInfo: ErrorInfo) => void; // Optional error callback
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRecovering: boolean;
  recoveryAttempts: number;
  lastRecoveryTime: number;
}

export class ErrorBoundary extends Component<Props, State> {
  // Timer reference for automatic recovery attempts
  private resetTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Default props
  static defaultProps = {
    autoReset: false,
    resetTimeout: 5000, // 5 seconds
    resetSoft: true,
    onError: undefined,
  };

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isRecovering: false,
    recoveryAttempts: 0,
    lastRecoveryTime: 0
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI.
    return { 
      hasError: true, 
      error,
      isRecovering: false
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Store error info for better debugging display
    this.setState({ errorInfo });
    
    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Start automatic recovery process if enabled
    if (this.props.autoReset) {
      this.startAutoRecovery();
    }
  }
  
  // Set up auto-recovery if enabled
  private startAutoRecovery() {
    // Clear any existing timer
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    
    // Check if we've tried too many recoveries too quickly (prevent infinite loops)
    const now = Date.now();
    const tooManyAttempts = 
      this.state.recoveryAttempts > 3 && 
      (now - this.state.lastRecoveryTime < 60000); // within last minute
    
    if (tooManyAttempts) {
      console.warn('Too many recovery attempts, stopping auto-recovery');
      return;
    }
    
    // Set timer for auto-recovery
    this.resetTimer = setTimeout(() => {
      this.setState({ isRecovering: true });
      
      // Based on reset strategy, either reset cache or reload page
      if (this.props.resetSoft) {
        this.handleSoftReset();
      } else {
        window.location.reload();
      }
    }, this.props.resetTimeout);
  }
  
  // Component cleanup
  componentWillUnmount() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
  }
  
  // Soft reset - clear query cache and reset component state
  private handleSoftReset = () => {
    // Reset React Query cache
    queryClient.clear();
    
    // Update state to track recovery attempts
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      recoveryAttempts: prevState.recoveryAttempts + 1,
      lastRecoveryTime: Date.now()
    }));
  };
  
  // Hard reset - reload the whole page
  private handleHardReset = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 border border-amber-200 rounded-lg bg-amber-50 m-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <h2 className="text-xl font-bold text-amber-700">Something went wrong</h2>
          </div>
          
          <p className="text-amber-700 mb-2 text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred in the application'}
          </p>
          
          <div className="text-xs text-amber-600/80 mb-6 max-w-lg overflow-hidden max-h-32 overflow-y-auto p-2 bg-amber-100/50 rounded">
            {this.state.errorInfo?.componentStack || 'No component stack available'}
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={this.handleSoftReset}
              className="flex items-center gap-1"
              disabled={this.state.isRecovering}
            >
              <RefreshCw className={`h-4 w-4 ${this.state.isRecovering ? 'animate-spin' : ''}`} />
              Reset State
            </Button>
            
            <Button
              variant="default"
              onClick={this.handleHardReset}
              className="bg-amber-600 hover:bg-amber-700"
              disabled={this.state.isRecovering}
            >
              Reload Page
            </Button>
          </div>
          
          {this.state.isRecovering && (
            <p className="text-amber-600 text-sm mt-4">
              Attempting to recover...
            </p>
          )}
          
          {this.state.recoveryAttempts > 2 && (
            <p className="text-amber-700 text-xs mt-4 max-w-md text-center">
              Multiple recovery attempts have been made. If problems persist, please try clearing your browser cache or contact support.
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
