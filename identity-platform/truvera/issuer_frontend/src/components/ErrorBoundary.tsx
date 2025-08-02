import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service if needed
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // In a real application, you would send this to your error tracking service
    // For now, we'll just log it to the console with structured data
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.error('Error logged to service:', errorData);
    
    // You could send this to services like Sentry, LogRocket, etc.
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md lg:max-w-lg">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 lg:px-12 lg:py-10">
              <div className="text-center">
                <div className="mb-8">
                  <svg
                    className="mx-auto h-16 w-16 lg:h-20 lg:w-20 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>

                <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 mb-4">
                  Something went wrong
                </h2>

                <p className="text-gray-600 text-base lg:text-lg mb-8">
                  An unexpected error occurred while processing your request. 
                  Our team has been notified and is working to fix the issue.
                </p>

                {/* Error details (only in development) */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-lg text-left">
                    <h3 className="text-sm md:text-base font-medium text-red-800 mb-3">
                      Error Details (Development Only)
                    </h3>
                    <div className="text-xs md:text-sm text-red-700 font-mono">
                      <div className="mb-2">
                        <strong>Message:</strong> {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <div className="mb-2">
                          <strong>Stack:</strong>
                          <pre className="whitespace-pre-wrap mt-1 text-xs">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="whitespace-pre-wrap mt-1 text-xs">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recovery options */}
                <div className="space-y-4">
                  <button
                    onClick={this.handleRetry}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors text-base"
                  >
                    Try Again
                  </button>
                  
                  <button
                    onClick={this.handleReload}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-md transition-colors text-base"
                  >
                    Reload Page
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/'}
                    className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-3 px-6 rounded-md transition-colors text-base"
                  >
                    Go to Home
                  </button>
                </div>

                {/* Support information */}
                <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm md:text-base font-medium text-blue-900 mb-3">
                    Need Help?
                  </h4>
                  <p className="text-xs md:text-sm text-blue-800">
                    If this problem persists, please contact our support team with the error details above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;